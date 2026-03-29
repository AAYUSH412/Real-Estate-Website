import { config } from "../config/config.js";
import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import { registry } from "../utils/circuitBreaker.js";
import logger from "../utils/logger.js";

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

    // Initialize circuit breakers for each model
    this.primaryCircuit = registry.getBreaker('ai-primary', {
      failureThreshold: 3,
      timeout: 60000, // 1 minute
      name: `ai-${PRIMARY_MODEL}`
    });

    this.fallbackCircuit = registry.getBreaker('ai-fallback', {
      failureThreshold: 5,
      timeout: 120000, // 2 minutes for fallback
      name: `ai-${FALLBACK_MODEL}`
    });
  }

  async validateApiKey() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);

    try {
      const response = await this.client.path('/chat/completions').post({
        body: {
          messages: [
            { role: 'system', content: 'Reply with OK only.' },
            { role: 'user', content: 'OK?' }
          ],
          model: FALLBACK_MODEL,
          temperature: 0,
          max_tokens: 8,
          top_p: 1
        },
        ...(controller.signal ? { signal: controller.signal } : {}),
      });

      if (isUnexpected(response)) {
        const errorMsg = response.body.error?.message || 'Unknown AI API error';
        throw new Error(`AI API error: ${errorMsg}`);
      }

      return { valid: true };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Generate text using GitHub Models with automatic fallback and circuit breaker protection.
   * Tries PRIMARY_MODEL first; falls back to FALLBACK_MODEL on rate-limit or error.
   */
  async generateText(prompt, systemPrompt = SYSTEM_PROMPT) {
    // Try primary model with circuit breaker
    try {
      const result = await this.primaryCircuit.execute(async () => {
        return await this._callModel(PRIMARY_MODEL, prompt, systemPrompt);
      });

      if (result) return result;
    } catch (error) {
      logger.warn('Primary circuit breaker triggered', { model: PRIMARY_MODEL, error: error.message });
    }

    // Fallback to nano model with circuit breaker
    try {
      logger.warn('Falling back to secondary model', { from: PRIMARY_MODEL, to: FALLBACK_MODEL });

      const fallbackResult = await this.fallbackCircuit.execute(async () => {
        return await this._callModel(FALLBACK_MODEL, prompt, systemPrompt);
      });

      if (fallbackResult) return fallbackResult;
    } catch (error) {
      logger.error('Fallback circuit breaker triggered', { model: FALLBACK_MODEL, error: error.message });
    }

    return JSON.stringify({ error: "AI service is temporarily unavailable. Please try again later." });
  }

  async _callModel(model, prompt, systemPrompt) {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      logger.warn('AI model request timeout', { model, timeoutMs: AI_TIMEOUT_MS });
    }, AI_TIMEOUT_MS);

    try {
      logger.info('Calling AI model', { model });
      const startTime = Date.now();

      const response = await this.client.path("/chat/completions").post({
        body: {
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
          ],
          model,
          temperature: 0.3,
          max_tokens: 4000,   // increased for 12 properties with Phase 3 fields (match_score, red_flags, etc.)
          top_p: 1
        },
        // Pass abort signal if the SDK supports it
        ...(controller.signal ? { signal: controller.signal } : {}),
      });

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.info('AI model responded', { model, elapsedSeconds: elapsed });

      if (isUnexpected(response)) {
        const errorMsg = response.body.error?.message || 'Unknown AI API error';
        logger.error('AI model error', { model, error: errorMsg });
        throw new Error(`AI API error: ${errorMsg}`);
      }

      return response.body.choices[0].message.content;
    } catch (error) {
      if (error.name === 'AbortError') {
        logger.error('AI model request aborted', { model, reason: 'timeout' });
        throw new Error(`AI request timeout after ${AI_TIMEOUT_MS / 1000}s`);
      } else {
        logger.error('AI model exception', { model, error: error.message });
        throw error;
      }
    } finally {
      clearTimeout(timer);
    }
  }


  // ── Data Preparation ──────────────────────────────────────────

  _preparePropertyData(properties, maxProperties = 20) {
    return properties.slice(0, maxProperties).map(p => ({
      building_name:     p.building_name,
      builder_name:      p.builder_name      || '',
      property_type:     p.property_type,
      bhk_config:        p.bhk_config        || '',
      location_address:  p.location_address,
      price:             p.price             || p.total_price || '',
      price_per_sqft:    p.price_per_sqft    || '',
      area_sqft:         p.carpet_area_sqft  || p.area_sqft  || '',
      possession_status: p.possession_status || '',
      rera_number:       p.rera_number       || '',
      parking:           p.parking           || '',
      floor_number:      p.floor_number      || '',
      nearby_landmarks:  Array.isArray(p.nearby_landmarks)
        ? p.nearby_landmarks.slice(0, 3).join(', ')
        : (p.nearby_landmarks || ''),
      amenities:         Array.isArray(p.amenities) ? p.amenities.slice(0, 5) : [],
      description:       p.description
        ? p.description.substring(0, 150) + (p.description.length > 150 ? '...' : '')
        : '',
    }));
  }

  _prepareLocationData(locations, maxLocations = 5) {
    return locations.slice(0, maxLocations);
  }

  // ── Analysis Methods ──────────────────────────────────────────

  async analyzeProperties(properties, { city, locality, bhk, minPrice, maxPrice, propertyType, propertyCategory }) {
    const preparedProperties = this._preparePropertyData(properties);

    const minNum   = parseFloat(minPrice) || 0;
    const maxNum   = parseFloat(maxPrice);
    const minLabel = minNum > 0
      ? (minNum < 1 ? `₹${Math.round(minNum * 100)}L` : `₹${minNum}Cr`)
      : null;
    const maxLabel = maxNum < 1
      ? `₹${Math.round(maxNum * 100)}L`
      : `₹${maxNum}Cr`;
    const budgetRange = minLabel ? `${minLabel}–${maxLabel}` : `up to ${maxLabel}`;

    const typeLabels = {
      'Flat': 'flat', 'House': 'independent house', 'Villa': 'villa',
      'Plot': 'plot', 'Penthouse': 'penthouse', 'Studio': 'studio apartment',
      'Commercial': 'commercial property',
    };
    const typeLabel = typeLabels[propertyType] || (propertyType || 'property').toLowerCase();

    const locationStr = locality ? `${locality}, ${city}` : city;

    const prompt = `You are an expert Indian real estate advisor.
Rank these ${preparedProperties.length} ${typeLabel}s in ${locationStr} for a buyer with budget ${budgetRange}.

Properties:
${JSON.stringify(preparedProperties, null, 2)}

PRICE BENCHMARKS (₹/sqft) FOR REFERENCE:

MUMBAI:
- Premium (Bandra, Worli, Lower Parel): ₹35,000-60,000/sqft
- Mid-tier (Andheri, Powai, Goregaon): ₹18,000-35,000/sqft
- Affordable (Thane, Navi Mumbai): ₹10,000-18,000/sqft

BANGALORE:
- Premium (Koramangala, Indiranagar, Whitefield): ₹12,000-20,000/sqft
- Mid-tier (Marathahalli, Sarjapur, HSR): ₹8,000-12,000/sqft
- Emerging (Electronic City, Yelahanka): ₹5,000-8,000/sqft

PUNE:
- Premium (Koregaon Park, Kalyani Nagar): ₹15,000-25,000/sqft
- Mid-tier (Baner, Hinjewadi, Wakad): ₹8,000-15,000/sqft
- Affordable (Wagholi, Undri): ₹5,000-8,000/sqft

DELHI NCR:
- Premium (Golf Course Road, MG Road): ₹18,000-35,000/sqft
- Mid-tier (Dwarka, Rohini, Greater Noida West): ₹8,000-15,000/sqft
- Emerging (Sector 150 Noida, New Gurgaon): ₹5,000-8,000/sqft

HYDERABAD:
- Premium (Banjara Hills, Jubilee Hills, Gachibowli): ₹10,000-18,000/sqft
- Mid-tier (HITEC City, Madhapur, Kondapur): ₹6,000-10,000/sqft
- Emerging (Kompally, Miyapur): ₹4,000-6,000/sqft

Compare each property's price_per_sqft against these benchmarks.
Flag as "overpriced" if >20% above area average.
Flag as "good_deal" if >15% below area average.

Rank each property based on:
1. Price vs locality average (value for money) — use price_per_sqft and above benchmarks
2. Builder reputation — known builders (Godrej, Lodha, Prestige, Sobha, DLF, Tata, etc.) score higher; unknown builders are a risk
3. Possession status — Ready to Move > possession within 1 year > 2026 > 2027+
4. RERA registration — rera_number present means legally safe; missing is a red flag
5. Connectivity — metro station, school, hospital in nearby_landmarks scores higher
6. Premium amenities — Pool, Gym, Clubhouse, Sports facilities add significant value

For EACH property provide all of these fields:
- match_score: integer 0–100 (fit for buyer's stated criteria)
- one_line_insight: max 20 words, SPECIFIC — use real data e.g. "₹8,200/sqft below SG Highway avg, RERA ✓, metro 600m"
- red_flags: array of objects with severity levels, e.g. [{"flag": "No RERA registration", "severity": "critical"}, {"flag": "Possession delayed to 2027", "severity": "medium"}, {"flag": "Unknown builder", "severity": "low"}] — empty array [] if none. Severity must be one of: "critical" | "medium" | "low"
- value_verdict: exactly one of "good_deal" | "fair" | "overpriced"
- investment_horizon: exactly one of "short_term" | "long_term" | "both"
- investment_reason: brief explanation (max 25 words) — e.g. "Ready possession + undervalued = quick resale potential" OR "Under construction in developing area = appreciation play"
- negotiation_tips: array of 1-2 specific negotiation strategies for this property, e.g. ["Offer ₹10L below asking due to delayed possession", "Leverage lack of RERA to negotiate 5% discount"]
- price_trend_context: one sentence about the area's recent price movement, e.g. "This locality appreciated 12% last year" or "Prices stable for 18 months"

Respond ONLY with this exact JSON (no markdown, no extra text):
{
  "overview": [
    {
      "name": "building name",
      "price": "price string",
      "area": "sqft string",
      "location": "address",
      "highlight": "one specific standout feature using actual data",
      "match_score": 85,
      "one_line_insight": "specific insight max 20 words",
      "red_flags": [{"flag": "concern text", "severity": "critical|medium|low"}],
      "value_verdict": "good_deal",
      "investment_horizon": "short_term",
      "investment_reason": "explanation max 25 words",
      "negotiation_tips": ["tip 1", "tip 2"],
      "price_trend_context": "area price trend in one sentence"
    }
  ],
  "best_value": {
    "name": "building name of top pick",
    "reason": "why it is the best value — reference price_per_sqft, possession, RERA, or connectivity"
  },
  "recommendations": [
    "actionable tip 1 for this specific search",
    "actionable tip 2",
    "actionable tip 3"
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