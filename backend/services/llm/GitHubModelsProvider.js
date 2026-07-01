import ModelClient, { isUnexpected } from '@azure-rest/ai-inference';
import { AzureKeyCredential } from '@azure/core-auth';
import { registry } from '../../utils/circuitBreaker.js';
import logger from '../../utils/logger.js';
import { LLMProvider } from './LLMProvider.js';

const PRIMARY_MODEL  = 'gpt-4.1-mini';
const FALLBACK_MODEL = 'gpt-4.1-nano';
const TIMEOUT_MS     = 30_000;

export class GitHubModelsProvider extends LLMProvider {
  constructor(apiKey) {
    super('GitHubModels');
    if (!apiKey) throw new Error('[GitHubModelsProvider] API key required');
    this.client = ModelClient(
      'https://models.inference.ai.azure.com',
      new AzureKeyCredential(apiKey)
    );
    this.primaryCircuit  = registry.getBreaker('ghm-primary',  { failureThreshold: 3, timeout: 60_000,  name: `ghm-${PRIMARY_MODEL}`  });
    this.fallbackCircuit = registry.getBreaker('ghm-fallback', { failureThreshold: 5, timeout: 120_000, name: `ghm-${FALLBACK_MODEL}` });
  }

  isHealthy() {
    return this.primaryCircuit.isHealthy() || this.fallbackCircuit.isHealthy();
  }

  async validateKey() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const res = await this.client.path('/chat/completions').post({
        body: {
          messages: [{ role: 'system', content: 'Reply OK.' }, { role: 'user', content: 'OK?' }],
          model: FALLBACK_MODEL,
          temperature: 0,
          max_tokens: 8,
        },
      });
      if (isUnexpected(res)) throw new Error(res.body.error?.message || 'Unknown error');
      return { valid: true };
    } finally {
      clearTimeout(timer);
    }
  }

  async generateText(prompt, systemPrompt, opts = {}) {
    // Try primary
    try {
      return await this.primaryCircuit.execute(() =>
        this._call(PRIMARY_MODEL, prompt, systemPrompt, opts)
      );
    } catch (err) {
      logger.warn('GitHubModels primary failed, trying fallback', { error: err.message });
    }
    // Fallback
    return await this.fallbackCircuit.execute(() =>
      this._call(FALLBACK_MODEL, prompt, systemPrompt, opts)
    );
  }

  async _call(model, prompt, systemPrompt, opts) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? TIMEOUT_MS);
    try {
      logger.info('GitHubModels calling model', { model });
      const t0  = Date.now();
      const res = await this.client.path('/chat/completions').post({
        body: {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: prompt       },
          ],
          model,
          temperature: opts.temperature ?? 0.3,
          max_tokens:  opts.maxTokens   ?? 4000,
          top_p: 1,
          // JSON mode if the caller requests it
          ...(opts.jsonMode && { response_format: { type: 'json_object' } }),
        },
      });
      logger.info('GitHubModels responded', { model, ms: Date.now() - t0 });
      if (isUnexpected(res)) throw new Error(res.body.error?.message || 'Unknown error');
      return res.body.choices[0].message.content;
    } catch (err) {
      if (err.name === 'AbortError') throw new Error(`GitHubModels timeout after ${(opts.timeoutMs ?? TIMEOUT_MS) / 1000}s`);
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}
