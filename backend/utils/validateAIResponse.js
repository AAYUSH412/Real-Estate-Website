/**
 * Validate and fix AI-generated JSON responses.
 * Ensures the response always has the expected structure,
 * even if the AI returns malformed output.
 */

/**
 * Attempt to repair truncated JSON by closing open structures.
 * Handles common cases like unterminated strings, arrays, and objects.
 */
function repairTruncatedJSON(text) {
  let repaired = text.trim();

  // Count unclosed brackets and braces
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < repaired.length; i++) {
    const char = repaired[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"' && !escaped) {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '{') openBraces++;
      if (char === '}') openBraces--;
      if (char === '[') openBrackets++;
      if (char === ']') openBrackets--;
    }
  }

  // If we're still in a string, close it
  if (inString) {
    repaired += '"';
  }

  // Remove trailing comma if present
  repaired = repaired.replace(/,\s*$/, '');

  // Close any unclosed arrays and objects
  while (openBrackets > 0) {
    repaired += ']';
    openBrackets--;
  }
  while (openBraces > 0) {
    repaired += '}';
    openBraces--;
  }

  return repaired;
}

/**
 * Parse a raw AI response string into an object.
 * Handles cases where the AI wraps JSON in code fences.
 * Attempts to repair truncated JSON if initial parse fails.
 */
function safeParse(raw) {
  if (typeof raw === 'object' && raw !== null) return raw;

  let text = String(raw).trim();

  // Strip markdown code fences if present
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

  // First attempt: direct parse
  try {
    return JSON.parse(text);
  } catch (firstError) {
    // Second attempt: try to repair truncated JSON
    try {
      const repaired = repairTruncatedJSON(text);
      const parsed = JSON.parse(repaired);
      console.log('[Validation] JSON repaired successfully after truncation');
      return parsed;
    } catch (repairError) {
      // Throw the original error for better debugging
      throw firstError;
    }
  }
}

/**
 * Validate and fix a property analysis response.
 * Expected schema: { overview[], best_value, recommendations[] }
 * Phase 3 adds per-item: match_score, one_line_insight, red_flags, value_verdict
 */
export function validateAndFixPropertyAnalysis(rawResponse, properties = []) {
  try {
    const parsed = safeParse(rawResponse);

    // Ensure overview is an array with correct shape — preserve all Phase 3 fields
    const overview = Array.isArray(parsed.overview)
      ? parsed.overview.map(item => ({
          name:             item.name             || 'Unknown',
          price:            item.price            || 'Contact for price',
          area:             item.area             || 'N/A',
          location:         item.location         || '',
          highlight:        item.highlight        || '',
          match_score:      typeof item.match_score === 'number' ? item.match_score : null,
          one_line_insight: item.one_line_insight  || '',
          red_flags:        Array.isArray(item.red_flags) ? item.red_flags : [],
          value_verdict:    ['good_deal', 'fair', 'overpriced'].includes(item.value_verdict)
                              ? item.value_verdict : null,
        }))
      : properties.slice(0, 6).map(p => ({
          name:             p.building_name || 'Unknown',
          price:            p.price         || 'Contact for price',
          area:             p.area_sqft     || 'N/A',
          location:         p.location_address || '',
          highlight:        'Property details available',
          match_score:      null,
          one_line_insight: '',
          red_flags:        [],
          value_verdict:    null,
        }));

    return {
      overview,
      best_value: parsed.best_value || null,
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations
        : ['Contact us for personalized recommendations'],
    };
  } catch (error) {
    console.error('[Validation] Property analysis parse failed:', error.message);
    return {
      error: 'Analysis format issue',
      overview: properties.slice(0, 6).map(p => ({
        name:             p.building_name || 'Unknown',
        price:            p.price         || 'Contact for price',
        area:             p.area_sqft     || 'N/A',
        location:         p.location_address || '',
        highlight:        'Property details available',
        match_score:      null,
        one_line_insight: '',
        red_flags:        [],
        value_verdict:    null,
      })),
      best_value: null,
      recommendations: ['Please contact us for detailed analysis'],
    };
  }
}

/**
 * Validate and fix a location trends analysis response.
 * Expected schema: { trends[], top_appreciation, best_rental_yield, investment_tips[] }
 */
export function validateAndFixLocationAnalysis(rawResponse) {
  try {
    const parsed = safeParse(rawResponse);

    return {
      trends: Array.isArray(parsed.trends)
        ? parsed.trends.map(t => ({
            location: t.location || 'Unknown',
            price_per_sqft: Number(t.price_per_sqft) || 0,
            yearly_change_pct: Number(t.yearly_change_pct) || 0,
            rental_yield_pct: Number(t.rental_yield_pct) || 0,
            outlook: t.outlook || '',
          }))
        : [],
      top_appreciation: parsed.top_appreciation || null,
      best_rental_yield: parsed.best_rental_yield || null,
      investment_tips: Array.isArray(parsed.investment_tips)
        ? parsed.investment_tips
        : ['Contact us for personalized investment advice'],
    };
  } catch (error) {
    console.error('[Validation] Location analysis parse failed:', error.message);
    return {
      error: 'Analysis format issue',
      trends: [],
      top_appreciation: null,
      best_rental_yield: null,
      investment_tips: ['Please contact us for detailed analysis'],
    };
  }
}
