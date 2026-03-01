import { config } from "../config/config.js";
import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";

const PRIMARY_MODEL = "gpt-4.1-mini";
const FALLBACK_MODEL = "gpt-4.1-nano";

// Request timeout for GitHub Models calls (30 seconds)
const AI_TIMEOUT_MS = 30_000;

const SYSTEM_PROMPT = `You are a concise Indian real estate expert assistant.
Rules:
- Always respond with valid JSON matching the requested schema.
- Use INR currency (Lakhs/Crores) for all prices.
- Keep analysis factual and data-driven — no speculation.
- Never include markdown, code fences, or extra text outside the JSON.`;

class AIService {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('[AIService] API key is required — no fallback allowed.');
    }
    this.apiKey = apiKey;
    this.client = ModelClient(
      "https://models.inference.ai.azure.com",
      new AzureKeyCredential(this.apiKey)
    );
  }

  /**
   * Generate text using GitHub Models with automatic fallback.
   * Tries PRIMARY_MODEL first; falls back to FALLBACK_MODEL on rate-limit or error.
   */
  async generateText(prompt, systemPrompt = SYSTEM_PROMPT) {
    const result = await this._callModel(PRIMARY_MODEL, prompt, systemPrompt);
    if (result) return result;

    // Fallback to nano model if primary fails
    console.warn(`Primary model (${PRIMARY_MODEL}) failed. Falling back to ${FALLBACK_MODEL}...`);
    const fallbackResult = await this._callModel(FALLBACK_MODEL, prompt, systemPrompt);
    if (fallbackResult) return fallbackResult;

    return JSON.stringify({ error: "AI service is temporarily unavailable. Please try again later." });
  }

  async _callModel(model, prompt, systemPrompt) {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      console.warn(`[AI] ${model} timed out after ${AI_TIMEOUT_MS / 1000}s`);
    }, AI_TIMEOUT_MS);

    try {
      console.log(`[AI] Calling ${model} at ${new Date().toISOString()}`);
      const startTime = Date.now();

      const response = await this.client.path("/chat/completions").post({
        body: {
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
          ],
          model,
          temperature: 0.3,
          max_tokens: 1500,   // increased from 800 — prevents JSON truncation
          top_p: 1
        },
        // Pass abort signal if the SDK supports it
        ...(controller.signal ? { signal: controller.signal } : {}),
      });

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`[AI] ${model} responded in ${elapsed}s`);

      if (isUnexpected(response)) {
        console.error(`[AI] ${model} error:`, response.body.error?.message);
        return null;
      }

      return response.body.choices[0].message.content;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error(`[AI] ${model} aborted — timeout exceeded`);
      } else {
        console.error(`[AI] ${model} exception:`, error.message);
      }
      return null;
    } finally {
      clearTimeout(timer);
    }
  }


  // ── Data Preparation ──────────────────────────────────────────

  _preparePropertyData(properties, maxProperties = 3) {
    return properties.slice(0, maxProperties).map(p => ({
      building_name: p.building_name,
      property_type: p.property_type,
      location_address: p.location_address,
      price: p.price,
      area_sqft: p.area_sqft,
      amenities: Array.isArray(p.amenities) ? p.amenities.slice(0, 5) : [],
      description: p.description
        ? p.description.substring(0, 150) + (p.description.length > 150 ? '...' : '')
        : ''
    }));
  }

  _prepareLocationData(locations, maxLocations = 5) {
    return locations.slice(0, maxLocations);
  }

  // ── Analysis Methods ──────────────────────────────────────────

  async analyzeProperties(properties, city, maxPrice, propertyCategory, propertyType) {
    const preparedProperties = this._preparePropertyData(properties);

    // Format budget in human-readable form
    const priceNum = parseFloat(maxPrice);
    const budgetLabel = priceNum < 1
      ? `${Math.round(priceNum * 100)} Lakhs`
      : `${priceNum} Crores`;

    // Map property type to readable label
    const typeLabels = {
      'Flat': 'Flats/Apartments',
      'House': 'Independent Houses',
      'Villa': 'Villas',
      'Plot': 'Plots/Land',
      'Penthouse': 'Penthouses',
      'Studio': 'Studio Apartments',
      'Commercial': 'Commercial Properties',
    };
    const typeLabel = typeLabels[propertyType] || propertyType;

    const prompt = `Analyze these ${propertyCategory} ${typeLabel} in ${city} (budget: ≤ ₹${budgetLabel}):

${JSON.stringify(preparedProperties)}

Respond ONLY with this JSON schema:
{
  "overview": [
    {
      "name": "building name",
      "price": "price string",
      "area": "sqft string",
      "location": "address",
      "highlight": "one-line standout feature"
    }
  ],
  "best_value": {
    "name": "building name",
    "reason": "why it offers the best value in 1-2 sentences"
  },
  "recommendations": [
    "actionable recommendation 1",
    "actionable recommendation 2",
    "actionable recommendation 3"
  ]
}`;

    return this.generateText(prompt);
  }

  async analyzeLocationTrends(locations, city) {
    const preparedLocations = this._prepareLocationData(locations);

    const prompt = `Analyze these real estate price trends for ${city}:

${JSON.stringify(preparedLocations)}

Respond ONLY with this JSON schema:
{
  "trends": [
    {
      "location": "area name",
      "price_per_sqft": 0,
      "yearly_change_pct": 0,
      "rental_yield_pct": 0,
      "outlook": "brief 1-line outlook"
    }
  ],
  "top_appreciation": {
    "location": "area with highest price growth",
    "reason": "why in 1 sentence"
  },
  "best_rental_yield": {
    "location": "area with best rental returns",
    "reason": "why in 1 sentence"
  },
  "investment_tips": [
    "tip 1",
    "tip 2",
    "tip 3"
  ]
}`;

    return this.generateText(prompt);
  }
}

/**
 * Factory — create an AIService with a caller-supplied API key.
 * The default-singleton export is intentionally removed:
 * server env-var keys MUST NOT be used as a fallback.
 */
export function createAIService(apiKey) {
  return new AIService(apiKey);
}