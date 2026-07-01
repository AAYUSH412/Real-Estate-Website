import logger from '../../utils/logger.js';

export class LLMRouter {
  // providers: LLMProvider[] in priority order (first = primary)
  constructor(providers) {
    if (!providers?.length) throw new Error('[LLMRouter] At least one provider required');
    this.providers = providers;
  }

  get primaryProvider() {
    return this.providers[0].name;
  }

  async generateText(prompt, systemPrompt, opts = {}) {
    for (const provider of this.providers) {
      if (!provider.isHealthy()) {
        logger.warn('LLMRouter skipping unhealthy provider', { provider: provider.name });
        continue;
      }
      try {
        const result = await provider.generateText(prompt, systemPrompt, opts);
        if (result) return result;
      } catch (err) {
        logger.warn('LLMRouter provider failed, trying next', { provider: provider.name, error: err.message });
      }
    }
    throw new Error('All LLM providers exhausted or unhealthy');
  }

  // Validates all providers; returns per-provider results
  async validateAll() {
    const results = await Promise.allSettled(
      this.providers.map(p => p.validateKey().then(r => ({ provider: p.name, ...r })))
    );
    return results.map((r, i) => ({
      provider: this.providers[i].name,
      valid: r.status === 'fulfilled',
      error: r.reason?.message || null,
    }));
  }

  getStatus() {
    return this.providers.map(p => ({
      provider: p.name,
      healthy: p.isHealthy(),
    }));
  }
}
