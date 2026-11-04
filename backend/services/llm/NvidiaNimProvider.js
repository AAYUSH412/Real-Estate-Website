import axios from 'axios';
import { registry } from '../../utils/circuitBreaker.js';
import { LLMProvider } from './LLMProvider.js';
import { modelFingerprint, validateModelConfig } from './modelProfiles.js';

const ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions';
export class NvidiaNimProvider extends LLMProvider {
  constructor(apiKey, modelsConfig = []) {
    super('NvidiaNim');
    if (!apiKey) throw new Error('NVIDIA_API_KEY is not configured');
    if (!modelsConfig.length) throw Object.assign(new Error('No enabled NVIDIA models are available'), { statusCode: 503 });
    this.apiKey = apiKey;
    this.models = modelsConfig.map(model => ({ ...model, ...validateModelConfig(model) }));
    this.circuits = this.models.map(model => registry.getBreaker(`nim-${model.slug}-${modelFingerprint(model).slice(0, 16)}`, { failureThreshold: 3, timeout: 30000, name: model.slug }));
  }
  isHealthy() { return this.circuits.some(circuit => circuit.isHealthy()); }
  async validateKey() {
    await this.generateText('Reply OK.', 'Reply briefly.', { maxTokens: 256, timeoutMs: 15000, exact: true });
    return { valid: true };
  }
  async generateText(prompt, systemPrompt, opts = {}) {
    const deadline = Date.now() + 120000;
    let attempts = 0;
    for (let i = 0; i < (opts.exact ? 1 : this.models.length); i++) {
      if (attempts >= 3 || Date.now() >= deadline) break;
      const model = this.models[i];
      if (!opts.exact && !this.circuits[i].canAttempt()) continue;
      const effective = {
        maxTokens: Math.min(opts.maxTokens ?? model.config.maxTokens, model.config.maxTokens),
        timeoutMs: Math.min(opts.timeoutMs ?? model.config.timeoutMs, model.config.timeoutMs, Math.max(1, deadline - Date.now())),
      };
      attempts++;
      try {
        const call = async () => {
          const result = await this._call(model.modelId, model.config, prompt, systemPrompt, effective);
          if (typeof result !== 'string' || !result.trim()) throw new Error('NVIDIA returned no final answer');
          if (opts.validate) opts.validate(result);
          return result;
        };
        const result = opts.exact ? await call() : await this.circuits[i].execute(call);
        opts.onResult?.({ provider: 'nvidia', modelId: model.modelId, slug: model.slug, version: model.__v || 0, configuration: modelFingerprint(model), fallback: i > 0, effective });
        return result;
      } catch (error) { if (opts.exact) throw error; }
    }
    throw Object.assign(new Error('NVIDIA models are temporarily unavailable'), { statusCode: 503, code: 'AI_UNAVAILABLE' });
  }
  async _call(modelId, config, prompt, systemPrompt, effective) {
    const body = {
      model: modelId, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }],
      stream: false, temperature: config.temperature, top_p: config.topP, max_tokens: effective.maxTokens,
      ...(config.enableThinking !== undefined && { chat_template_kwargs: { enable_thinking: config.enableThinking } }),
      ...(config.reasoningEffort !== undefined && { reasoning_effort: config.reasoningEffort }),
      ...(config.seed !== undefined && { seed: config.seed }),
      ...(config.frequencyPenalty !== undefined && { frequency_penalty: config.frequencyPenalty }),
      ...(config.presencePenalty !== undefined && { presence_penalty: config.presencePenalty }),
    };
    try {
      const response = await axios.post(ENDPOINT, body, {
        headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        timeout: effective.timeoutMs, maxContentLength: 2 * 1024 * 1024, maxBodyLength: 512 * 1024,
      });
      const choice = response.data?.choices?.[0];
      if (choice?.finish_reason === 'length') throw Object.assign(new Error('NVIDIA output reached its token limit'), { code: 'NVIDIA_OUTPUT_TRUNCATED' });
      const content = choice?.message?.content; // Never substitute reasoning_content.
      if (typeof content !== 'string' || !content.trim()) throw Object.assign(new Error('NVIDIA returned no final answer'), { code: 'NVIDIA_EMPTY_FINAL' });
      return content;
    } catch (error) {
      const status = error.response?.status;
      const code = ['NVIDIA_OUTPUT_TRUNCATED', 'NVIDIA_EMPTY_FINAL'].includes(error.code) ? error.code
        : ['ECONNABORTED', 'ETIMEDOUT'].includes(error.code) ? 'NVIDIA_TIMEOUT'
          : status === 429 ? 'NVIDIA_RATE_LIMITED' : [401, 403].includes(status) ? 'NVIDIA_AUTH_FAILED'
            : status === 404 ? 'NVIDIA_MODEL_UNAVAILABLE' : 'NVIDIA_REQUEST_FAILED';
      throw Object.assign(new Error('NVIDIA request failed or returned an unusable final answer'), { statusCode: 502, code });
    }
  }
}
