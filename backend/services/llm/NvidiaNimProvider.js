import axios from 'axios';
import { registry } from '../../utils/circuitBreaker.js';
import logger from '../../utils/logger.js';
import { LLMProvider } from './LLMProvider.js';

const BASE_URL = 'https://integrate.api.nvidia.com/v1';

// Hardcoded defaults — used when no DB-backed model config is provided.
// nemotron-3-nano-omni-30b: 30B omni model, ~114 TPS on NIM free tier.
//   enable_thinking:true + reasoning_budget:16384 (separate CoT pool, doesn't
//   eat into max_tokens) + max_tokens:65536 (model stops early when JSON ends).
//
// mistral-medium-3.5: 128B, no reasoning, ~38 TPS. Reliable fallback for when
//   nano circuit opens or times out.
const DEFAULT_MODELS = [
    {
        modelId: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
        slug: 'nemotron-nano',
        config: {
            maxTokens: 65536,
            timeoutMs: 120_000,
            temperature: 0.6,
            topP: 0.95,
            enableThinking: true,
            reasoningBudget: 16384,
        },
    },
    {
        modelId: 'mistralai/mistral-medium-3.5-128b',
        slug: 'mistral-medium',
        config: {
            maxTokens: 6000,
            timeoutMs: 90_000,
            temperature: 0.3,
            topP: 1,
            enableThinking: false,
            reasoningBudget: null,
        },
    },
];

export class NvidiaNimProvider extends LLMProvider {
    /**
     * @param {string} apiKey
     * @param {Array<{modelId:string, slug:string, config:object}>|null} modelsConfig
     *   Ordered list of models to try (primary first). If null, uses hardcoded defaults.
     */
    constructor(apiKey, modelsConfig = null) {
        super('NvidiaNim');
        if (!apiKey) throw new Error('[NvidiaNimProvider] API key required');
        this.apiKey = apiKey;
        this.models = modelsConfig || DEFAULT_MODELS;

        // Circuit breakers keyed by slug — global registry keeps them alive across requests
        this.circuits = this.models.map(m =>
            registry.getBreaker(`nim-${m.slug}`, {
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
        // Use the last model (usually mistral) for validation — lightweight, fast
        const last = this.models[this.models.length - 1];
        const res = await axios.post(
            `${BASE_URL}/chat/completions`,
            {
                model:       last.modelId,
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
        for (let i = 0; i < this.models.length; i++) {
            const model   = this.models[i];
            const circuit = this.circuits[i];

            if (!circuit.isHealthy()) {
                logger.warn('NvidiaNim circuit open, skipping', { slug: model.slug });
                continue;
            }

            try {
                return await circuit.execute(() =>
                    this._call(model.modelId, model.config, prompt, systemPrompt, opts)
                );
            } catch (err) {
                logger.warn('NvidiaNim model failed, trying next', { slug: model.slug, error: err.message });
            }
        }
        throw new Error('All NvidiaNim models exhausted');
    }

    async _call(modelId, config, prompt, systemPrompt, opts) {
        logger.info('NvidiaNim calling model', { modelId, thinking: config.enableThinking });
        const t0 = Date.now();

        const body = {
            model: modelId,
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
            // Models with enable_thinking:true split output into:
            //   reasoning_content → internal CoT (not shown to user)
            //   content           → final answer (what we want)
            const content = msg.content || msg.reasoning_content || null;

            logger.info('NvidiaNim responded', { modelId, ms: Date.now() - t0, hasContent: !!content });

            if (!content) {
                throw new Error(`NvidiaNim [${modelId}] returned empty content`);
            }

            return content;
        } catch (err) {
            if (err.response) {
                const status = err.response.status;
                const detail = err.response.data?.detail || err.response.data?.message || err.message;
                const wrapped = new Error(`NvidiaNim [${modelId}] ${status}: ${detail}`);
                wrapped.statusCode = status;
                throw wrapped;
            }
            throw err;
        }
    }
}
