import axios from 'axios';
import { registry } from '../../utils/circuitBreaker.js';
import logger from '../../utils/logger.js';
import { LLMProvider } from './LLMProvider.js';

const BASE_URL = 'https://integrate.api.nvidia.com/v1';

// nemotron-3-nano-omni: 30B, 114 TPS in playground — fastest on NIM free tier
// mistral-medium-3.5:  128B, 38 TPS  — reliable JSON, no reasoning overhead
// Both measured from build.nvidia.com playground; ultra-550b timed out (reasoning model)
const PRIMARY_MODEL  = 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning';
const FALLBACK_MODEL = 'mistralai/mistral-medium-3.5-128b';

// nano-omni @ 114 TPS → ~2500 token JSON ≈ 22s. 90s gives plenty of headroom.
const TIMEOUT_MS = 90_000;

export class NvidiaNimProvider extends LLMProvider {
  constructor(apiKey) {
    super('NvidiaNim');
    if (!apiKey) throw new Error('[NvidiaNimProvider] API key required');
    this.apiKey = apiKey;
    this.primaryCircuit  = registry.getBreaker('nim-primary',  { failureThreshold: 3, timeout: 60_000,  name: `nim-${PRIMARY_MODEL.split('/')[1]}`  });
    this.fallbackCircuit = registry.getBreaker('nim-fallback', { failureThreshold: 5, timeout: 120_000, name: `nim-${FALLBACK_MODEL.split('/')[1]}` });
  }

  isHealthy() {
    return this.primaryCircuit.isHealthy() || this.fallbackCircuit.isHealthy();
  }

  async validateKey() {
    // Use mistral for validation — lightweight, no reasoning overhead, fast
    const res = await axios.post(
      `${BASE_URL}/chat/completions`,
      {
        model: 'mistralai/mistral-medium-3.5-128b',
        messages: [{ role: 'user', content: 'Reply OK.' }],
        max_tokens: 4,
        temperature: 0,
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 25_000,
      }
    );
    if (res.status !== 200) throw new Error(`NIM validation returned ${res.status}`);
    return { valid: true };
  }

  async generateText(prompt, systemPrompt, opts = {}) {
    try {
      return await this.primaryCircuit.execute(() =>
        this._call(PRIMARY_MODEL, prompt, systemPrompt, opts)
      );
    } catch (err) {
      logger.warn('NvidiaNim primary failed, trying fallback', { error: err.message });
    }
    return await this.fallbackCircuit.execute(() =>
      this._call(FALLBACK_MODEL, prompt, systemPrompt, opts)
    );
  }

  async _call(model, prompt, systemPrompt, opts) {
    logger.info('NvidiaNim calling model', { model });
    const t0 = Date.now();

    const isReasoningModel = model.includes('reasoning') || model.includes('omni');

    const body = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: prompt       },
      ],
      temperature: opts.temperature ?? 0.3,
      max_tokens:  opts.maxTokens   ?? 4000,
      top_p: 1,
      ...(opts.jsonMode && { response_format: { type: 'json_object' } }),
      // Disable thinking/reasoning trace for JSON generation tasks.
      // Without this, reasoning models consume all tokens on internal chain-of-thought
      // and leave content empty — causing silent null responses.
      ...(isReasoningModel && { chat_template_kwargs: { enable_thinking: false } }),
    };

    // Caller can pass a tighter timeoutMs for small payloads (e.g. trends = 30s vs search = 90s)
    const requestTimeout = opts.timeoutMs ?? TIMEOUT_MS;

    try {
      const res = await axios.post(`${BASE_URL}/chat/completions`, body, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: requestTimeout,
      });

      const msg     = res.data.choices[0].message;
      // Reasoning models split output into reasoning_content + content.
      // content holds the final answer; fall back to reasoning_content if content is empty.
      const content = msg.content || msg.reasoning_content || null;

      logger.info('NvidiaNim responded', { model, ms: Date.now() - t0, hasContent: !!content });

      if (!content) {
        throw new Error(`NvidiaNim [${model}] returned empty content`);
      }

      return content;
    } catch (err) {
      // Re-throw structured errors from axios
      if (err.response) {
        const status = err.response.status;
        const detail = err.response.data?.detail || err.response.data?.message || err.message;
        const wrapped = new Error(`NvidiaNim [${model}] ${status}: ${detail}`);
        wrapped.statusCode = status;
        throw wrapped;
      }
      throw err;
    }
  }
}
