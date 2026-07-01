export class LLMProvider {
  constructor(name) {
    if (new.target === LLMProvider) throw new Error('LLMProvider is abstract');
    this.name = name;
  }

  // Returns { valid: true } or throws
  async validateKey() { throw new Error(`${this.name}: validateKey() not implemented`); }

  // Returns raw string (model response content)
  async generateText(_prompt, _systemPrompt, _opts = {}) {
    throw new Error(`${this.name}: generateText() not implemented`);
  }

  // Returns true when circuit is CLOSED or HALF_OPEN-recovered
  isHealthy() { throw new Error(`${this.name}: isHealthy() not implemented`); }
}
