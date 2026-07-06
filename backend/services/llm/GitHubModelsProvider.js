import OpenAI from 'openai';
import { registry } from '../../utils/circuitBreaker.js';
import logger from '../../utils/logger.js';
import { LLMProvider } from './LLMProvider.js';

const ENDPOINT = 'https://models.github.ai/inference';

// Hardcoded defaults — used when no DB-backed model config is provided.
// Params tuned for structured JSON output (low temp for determinism).
// top_p values match each model's GitHub Marketplace playground defaults.
const DEFAULT_MODELS = [
  {
    modelId: 'openai/gpt-4.1',
    slug: 'gpt-4-1',
    config: {
      maxTokens: 32768,
      timeoutMs: 30_000,
      temperature: 0.3,
      topP: 1.0,
    },
  },
  {
    modelId: 'meta/Llama-4-Scout-17B-16E-Instruct',
    slug: 'llama-4-scout',
    config: {
      maxTokens: 4096,
      timeoutMs: 45_000,
      temperature: 0.3,
      topP: 0.1,
    },
  },
  {
    modelId: 'mistral-ai/mistral-medium-2505',
    slug: 'mistral-medium-3',
    config: {
      maxTokens: 4096,
      timeoutMs: 45_000,
      temperature: 0.3,
      topP: 0.01,
    },
  },
];

export class GitHubModelsProvider extends LLMProvider {
  /**
   * @param {string} apiKey
   * @param {Array<{modelId:string, slug:string, config:object}>|null} modelsConfig
   *   Ordered list of models to try (primary first). If null, uses hardcoded defaults.
   */
  constructor(apiKey, modelsConfig = null) {
    super('GitHubModels');
    if (!apiKey) throw new Error('[GitHubModelsProvider] API key required');
    this.client = new OpenAI({ baseURL: ENDPOINT, apiKey });
    this.models  = modelsConfig || DEFAULT_MODELS;

    this.circuits = this.models.map(m =>
      registry.getBreaker(`ghm-${m.slug}`, {
        failureThreshold: 3,
        timeout: m.config.timeoutMs,
        name: m.slug,
      })
    );
  }

  isHealthy() {
    return this.circuits.some(c => c.isHealthy());
  }

  async validateKey() {
    const res = await this.client.chat.completions.create({
      model: DEFAULT_MODELS[0].modelId,
      messages: [{ role: 'user', content: 'Reply OK.' }],
      temperature: 0,
      max_tokens: 8,
    });
    if (!res.choices?.[0]?.message?.content) throw new Error('Empty validation response');
    return { valid: true };
  }

  async generateText(prompt, systemPrompt, opts = {}) {
    for (let i = 0; i < this.models.length; i++) {
      const model   = this.models[i];
      const circuit = this.circuits[i];

      if (!circuit.isHealthy()) {
        logger.warn('GitHubModels circuit open, skipping', { slug: model.slug });
        continue;
      }

      try {
        return await circuit.execute(() =>
          this._call(model.modelId, model.config, prompt, systemPrompt, opts)
        );
      } catch (err) {
        logger.warn('GitHubModels model failed, trying next', { slug: model.slug, error: err.message });
      }
    }
    throw new Error('All GitHubModels models exhausted');
  }

  async _call(modelId, config, prompt, systemPrompt, opts) {
    const controller = new AbortController();
    const timeoutMs  = opts.timeoutMs ?? config.timeoutMs;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      logger.info('GitHubModels calling model', { modelId });
      const t0 = Date.now();

      const body = {
        model:       modelId,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: prompt       },
        ],
        temperature: opts.temperature ?? config.temperature,
        max_tokens:  opts.maxTokens   ?? config.maxTokens,
        top_p:       config.topP,
        // JSON mode only for OpenAI models — Llama/Mistral don't support response_format
        ...(opts.jsonMode && modelId.startsWith('openai/') && {
          response_format: { type: 'json_object' },
        }),
      };

      const res = await this.client.chat.completions.create(body, {
        signal: controller.signal,
      });

      logger.info('GitHubModels responded', { modelId, ms: Date.now() - t0 });

      const content = res.choices[0]?.message?.content;
      if (!content) throw new Error(`GitHubModels [${modelId}] returned empty content`);
      return content;
    } catch (err) {
      if (err.name === 'AbortError' || err.code === 'ABORT_ERR') {
        throw new Error(`GitHubModels timeout after ${timeoutMs / 1000}s`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}
