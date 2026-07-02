import axios from 'axios';
import { registry } from '../../utils/circuitBreaker.js';
import logger from '../../utils/logger.js';
import { LLMProvider } from './LLMProvider.js';

const BASE_URL = 'https://integrate.api.nvidia.com/v1';

// nemotron-3-nano-omni-30b: 30B omni model, ~114 TPS on NIM free tier.
//   Previously misconfigured with enable_thinking:false and max_tokens:4000 —
//   that caused empty/truncated output. Correct config from NVIDIA playground:
//   enable_thinking:true + reasoning_budget:16384 (separate CoT pool, doesn't
//   eat into max_tokens) + max_tokens:65536 (model stops early when JSON ends,
//   real output is ~3-5k tokens ≈ 30-40s at 114 TPS).
//
// mistral-medium-3.5: 128B, no reasoning, ~38 TPS. Reliable fallback for when
//   nano circuit opens or times out.
const PRIMARY_MODEL  = 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning';
const FALLBACK_MODEL = 'mistralai/mistral-medium-3.5-128b';

// Per-model config: output budget, timeout, and reasoning settings.
// reasoning_budget reserves a separate token pool for CoT — content tokens
// (max_tokens) are not consumed by it.
const MODEL_CONFIG = {
    [PRIMARY_MODEL]: {
        maxTokens:       65536,  // model stops when JSON is complete (~3-5k tokens actual)
        timeoutMs:       120_000,
        temperature:     0.6,
        topP:            0.95,
        enableThinking:  true,
        reasoningBudget: 16384,
    },
    [FALLBACK_MODEL]: {
        maxTokens:       6000,
        timeoutMs:       90_000,
        temperature:     0.3,
        topP:            1,
        enableThinking:  false,
        reasoningBudget: null,
    },
};

export class NvidiaNimProvider extends LLMProvider {
    constructor(apiKey) {
        super('NvidiaNim');
        if (!apiKey) throw new Error('[NvidiaNimProvider] API key required');
        this.apiKey = apiKey;
        this.primaryCircuit  = registry.getBreaker('nim-primary',  { failureThreshold: 3, timeout: 120_000, name: 'nim-nano-omni-30b' });
        this.fallbackCircuit = registry.getBreaker('nim-fallback', { failureThreshold: 5, timeout: 90_000,  name: 'nim-mistral-128b' });
    }

    isHealthy() {
        return this.primaryCircuit.isHealthy() || this.fallbackCircuit.isHealthy();
    }

    async validateKey() {
        // Use mistral for validation — lightweight, no reasoning overhead, fast
        const res = await axios.post(
            `${BASE_URL}/chat/completions`,
            {
                model:       FALLBACK_MODEL,
                messages:    [{ role: 'user', content: 'Reply OK.' }],
                max_tokens:  4,
                temperature: 0,
            },
            {
                headers: {
                    Authorization:  `Bearer ${this.apiKey}`,
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
        const config = MODEL_CONFIG[model] ?? MODEL_CONFIG[FALLBACK_MODEL];
        logger.info('NvidiaNim calling model', { model, thinking: config.enableThinking });
        const t0 = Date.now();

        const body = {
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user',   content: prompt       },
            ],
            temperature: opts.temperature ?? config.temperature,
            max_tokens:  opts.maxTokens   ?? config.maxTokens,
            top_p:       config.topP,
            ...(opts.jsonMode && { response_format: { type: 'json_object' } }),
            ...(config.enableThinking !== null && {
                chat_template_kwargs: { enable_thinking: config.enableThinking },
            }),
            ...(config.reasoningBudget && {
                reasoning_budget: config.reasoningBudget,
            }),
        };

        const requestTimeout = opts.timeoutMs ?? config.timeoutMs;

        try {
            const res = await axios.post(`${BASE_URL}/chat/completions`, body, {
                headers: {
                    Authorization:  `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                timeout: requestTimeout,
            });

            const msg = res.data.choices[0].message;
            // Ultra with enable_thinking:true splits output into:
            //   reasoning_content → internal CoT (not shown to user)
            //   content           → final answer (what we want)
            // Without thinking, everything lands in content.
            const content = msg.content || msg.reasoning_content || null;

            logger.info('NvidiaNim responded', { model, ms: Date.now() - t0, hasContent: !!content });

            if (!content) {
                throw new Error(`NvidiaNim [${model}] returned empty content`);
            }

            return content;
        } catch (err) {
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
