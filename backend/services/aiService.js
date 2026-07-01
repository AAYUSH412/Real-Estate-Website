import { GitHubModelsProvider } from './llm/GitHubModelsProvider.js';
import { NvidiaNimProvider }    from './llm/NvidiaNimProvider.js';
import { LLMRouter }            from './llm/LLMRouter.js';
import logger from '../utils/logger.js';

const SYSTEM_PROMPT = `You are a concise Indian real estate expert assistant.
Rules:
- Always respond with valid JSON matching the requested schema.
- Use INR currency (Lakhs/Crores) for all prices.
- Keep analysis factual and data-driven — no speculation.
- Never include markdown, code fences, or extra text outside the JSON.`;

class AIService {
  constructor(router) {
    this.router = router;
  }

  async generateText(prompt, systemPrompt = SYSTEM_PROMPT, opts = {}) {
    return this.router.generateText(prompt, systemPrompt, { jsonMode: true, ...opts });
  }

  // ── Data Preparation ──────────────────────────────────────────

  _preparePropertyData(properties, maxProperties = 8) {
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

  /**
   * Format dynamic city benchmarks from the trends cache into a concise prompt section.
   * Replaces the old 5-city static block (~400 tokens) with ~50 tokens of live data.
   */
  _buildBenchmarkSection(city, cityBenchmarks) {
    if (!cityBenchmarks || cityBenchmarks.length === 0) {
      return (
        `PRICE BENCHMARKS FOR ${city.toUpperCase()}: No pre-fetched locality data available. ` +
        `Base value_verdict on relative price_per_sqft comparison between the listed properties only. ` +
        `If price_per_sqft is missing, set value_verdict to "fair".`
      );
    }

    const lines = cityBenchmarks.map(t => {
      const rate   = t.price_per_sqft ? `₹${Number(t.price_per_sqft).toLocaleString('en-IN')}/sqft` : 'N/A';
      const change = t.yearly_change_pct != null
        ? ` (${t.yearly_change_pct > 0 ? '+' : ''}${t.yearly_change_pct}% YoY)`
        : '';
      return `- ${t.location}: ${rate}${change}`;
    });

    return (
      `LIVE PRICE BENCHMARKS FOR ${city.toUpperCase()} (sourced from 99acres, current):\n` +
      lines.join('\n') + '\n\n' +
      `Compare each property's price_per_sqft against the nearest locality above.\n` +
      `Flag as "overpriced" if >20% above the closest benchmark.\n` +
      `Flag as "good_deal" if >15% below the closest benchmark.`
    );
  }

  async analyzeProperties(properties, { city, locality, bhk, minPrice, maxPrice, propertyType, propertyCategory, cityBenchmarks = null }) {
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
    const typeLabel   = typeLabels[propertyType] || (propertyType || 'property').toLowerCase();
    const locationStr = locality ? `${locality}, ${city}` : city;
    const benchmarkSection = this._buildBenchmarkSection(city, cityBenchmarks);
    logger.info('AI property analysis', {
      city,
      properties: preparedProperties.length,
      benchmarks: cityBenchmarks ? `${cityBenchmarks.length} localities (live)` : 'fallback (no trends cache)',
    });

    const prompt = `You are an expert Indian real estate advisor.
Rank these ${preparedProperties.length} ${typeLabel}s in ${locationStr} for a buyer with budget ${budgetRange}.

Properties:
${JSON.stringify(preparedProperties, null, 2)}

${benchmarkSection}

IMPORTANT: If price_per_sqft is missing for a property, set value_verdict to "fair" and add a low-severity red_flag: "Missing price_per_sqft data".
IMPORTANT: If a property's price is "Price on Request" or "POR", set value_verdict to "fair", match_score to 50, and add a medium red_flag: "Price not disclosed — contact developer for quote". Never invent a price.
Every claim in one_line_insight MUST reference a field from the input (price_per_sqft, rera_number, nearby_landmarks, possession_status).
RERA RULE: Only write "RERA ✓" in one_line_insight or highlight if rera_number in the input is a non-empty string. If rera_number is blank, empty, or absent — NEVER write "RERA ✓". Instead add a critical red_flag: "No RERA registration — legal compliance unverified".
Do NOT invent builder reputation. If builder_name is empty or unknown, add a "low" severity red_flag: "Unknown builder — verify credentials".

Rank each property based on:
1. Price vs locality average (value for money) — use price_per_sqft and above benchmarks
2. Builder reputation — known builders (Godrej, Lodha, Prestige, Sobha, DLF, Tata, etc.) score higher; unknown builders are a risk
3. Possession status — Ready to Move > possession within 1 year > 2026 > 2027+
4. RERA registration — rera_number present means legally safe; missing is a red flag
5. Connectivity — metro station, school, hospital in nearby_landmarks scores higher
6. Premium amenities — Pool, Gym, Clubhouse, Sports facilities add significant value

investment_horizon definitions:
- short_term = exit within 3 years for capital gain
- long_term  = hold 5+ years for appreciation
- both       = strong on both axes

━━━ FEW-SHOT EXAMPLES (study these before generating output) ━━━

EXAMPLE A — good_deal with strong data:
Input property:
{
  "building_name": "Kalpataru Jade Skyline",
  "builder_name": "Kalpataru",
  "price": "₹1.45 Cr",
  "price_per_sqft": "₹6,100/sqft",
  "area_sqft": "1180",
  "location_address": "Wakad, Pune",
  "possession_status": "Ready to Move",
  "rera_number": "P52100012345",
  "nearby_landmarks": ["Hinjewadi Phase 1 IT Park - 1.5km", "D-Mart - 500m", "Symbiosis School - 800m"],
  "amenities": ["Swimming Pool", "Gym", "Clubhouse", "24hr Security", "Power Backup"]
}
Correct output for this property:
{
  "name": "Kalpataru Jade Skyline",
  "price": "₹1.45 Cr",
  "area": "1180 sqft",
  "location": "Wakad, Pune",
  "highlight": "Ready to Move with RERA ✓ and Hinjewadi IT Park 1.5km — strong rental catchment",
  "match_score": 88,
  "one_line_insight": "₹6,100/sqft — 11% below Wakad avg, RERA ✓, Hinjewadi IT Park 1.5km",
  "red_flags": [],
  "value_verdict": "good_deal",
  "investment_horizon": "both",
  "investment_reason": "IT park proximity + ready possession = immediate rental yield; Wakad prices rising 9% YoY",
  "negotiation_tips": [
    "Builder has unsold inventory — ask for free covered parking (saves ₹3–5L)",
    "Ready possession: negotiate 2–3% off for cash/cheque payment within 30 days"
  ],
  "price_trend_context": "Wakad has seen 9% price appreciation YoY driven by Hinjewadi Phase 3 expansion"
}

EXAMPLE B — overpriced with missing data and POR:
Input property:
{
  "building_name": "Elite Residency",
  "builder_name": "",
  "price": "Price on Request",
  "price_per_sqft": "",
  "area_sqft": "",
  "location_address": "Baner, Pune",
  "possession_status": "Dec 2027",
  "rera_number": "",
  "nearby_landmarks": [],
  "amenities": ["Gym"]
}
Correct output for this property:
{
  "name": "Elite Residency",
  "price": "Price on Request",
  "area": "N/A",
  "location": "Baner, Pune",
  "highlight": "Under construction — possession Dec 2027, no RERA registration found",
  "match_score": 35,
  "one_line_insight": "Price undisclosed, no RERA, Dec 2027 possession — high risk, verify before engaging",
  "red_flags": [
    {"flag": "Price not disclosed — contact developer for quote", "severity": "medium"},
    {"flag": "No RERA registration — legal compliance unverified", "severity": "critical"},
    {"flag": "Unknown builder — verify credentials and past project delivery", "severity": "low"}
  ],
  "value_verdict": "fair",
  "investment_horizon": "long_term",
  "investment_reason": "Baner appreciates well long-term but Dec 2027 delivery and no RERA add significant risk",
  "negotiation_tips": [
    "Do not pay any booking amount before RERA registration is confirmed",
    "Request floor plan and cost sheet in writing before price discussion"
  ],
  "price_trend_context": "Baner prices have risen 12% YoY but new supply is increasing, moderating future gains"
}

━━━ END EXAMPLES — now analyse the actual properties above ━━━

You must rank ALL ${preparedProperties.length} properties. Every building name below must appear exactly once in the overview array:
${preparedProperties.map((p, i) => `${i + 1}. ${p.building_name}`).join('\n')}

For EACH of the ${preparedProperties.length} properties above provide all of these fields:
- match_score: integer 0–100
- one_line_insight: max 20 words, SPECIFIC — pattern: "₹X/sqft — Y% vs benchmark, KEY FACT (RERA/possession/landmark)"
- red_flags: array of objects [{"flag": "text", "severity": "critical|medium|low"}] — empty [] if none
- value_verdict: exactly one of "good_deal" | "fair" | "overpriced"
- investment_horizon: exactly one of "short_term" | "long_term" | "both"
- investment_reason: max 25 words, must reference a data field (landmark, possession, price trend)
- negotiation_tips: array of exactly 2 specific, actionable tips (not generic "negotiate the price")
- price_trend_context: one sentence with a % figure or trend direction for the specific locality

Respond ONLY with this exact JSON (no markdown, no extra text).
The overview array must have ${preparedProperties.length} objects — one per property, ranked by match_score descending:
{
  "overview": [
    {
      "name": "building name of property 1 (highest match_score)",
      "price": "price string",
      "area": "sqft string",
      "location": "address",
      "highlight": "one specific standout feature using actual data",
      "match_score": 85,
      "one_line_insight": "₹X/sqft — Y% vs area avg, KEY FACT",
      "red_flags": [{"flag": "concern text", "severity": "critical|medium|low"}],
      "value_verdict": "good_deal",
      "investment_horizon": "short_term",
      "investment_reason": "explanation max 25 words referencing actual data",
      "negotiation_tips": ["specific tip 1", "specific tip 2"],
      "price_trend_context": "locality trend with % figure"
    },
    {
      "name": "building name of property 2",
      "price": "...",
      "area": "...",
      "location": "...",
      "highlight": "...",
      "match_score": 78,
      "one_line_insight": "...",
      "red_flags": [],
      "value_verdict": "fair",
      "investment_horizon": "long_term",
      "investment_reason": "...",
      "negotiation_tips": ["...", "..."],
      "price_trend_context": "..."
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

    // 8 properties × ~600 tokens each ≈ 4800 tokens. 5500 gives headroom without hitting the truncation repair path.
    return this.generateText(prompt, SYSTEM_PROMPT, { maxTokens: 5500 });
  }

  async analyzeLocationTrends(locations, city) {
    const preparedLocations = this._prepareLocationData(locations);

    const prompt = `Analyze these ${preparedLocations.length} real estate localities for ${city}:

${JSON.stringify(preparedLocations)}

CRITICAL: The trends array must contain exactly ${preparedLocations.length} entries — one per locality. Do not repeat any locality.

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

    // Trends response is small (5 locations × ~100 tokens + tips).
    // maxTokens:1200 forces concise output; timeoutMs:30s matches the small expected payload.
    return this.generateText(prompt, SYSTEM_PROMPT, { maxTokens: 1200, timeoutMs: 30_000 });
  }
}

/**
 * Factory — build an AIService with the appropriate LLM provider chain.
 *
 * - nvidiaKey present → [NvidiaNim, GitHubModels] (NIM as primary, GitHub as fallback)
 * - nvidiaKey absent  → [GitHubModels] (current behaviour, unchanged)
 *
 * Server env-var keys MUST NOT be used as a fallback.
 */
export function createAIService(githubKey = null, nvidiaKey = null) {
  const providers = [];

  if (nvidiaKey)    providers.push(new NvidiaNimProvider(nvidiaKey));
  if (githubKey)    providers.push(new GitHubModelsProvider(githubKey));

  if (!providers.length) throw new Error('[AIService] At least one AI provider key is required.');

  logger.info('AIService: provider chain', { chain: providers.map(p => p.name).join(' → ') });
  return new AIService(new LLMRouter(providers));
}
