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
// Build a lookup map: building_name (lowercase) → rera_number
function buildReraLookup(properties) {
  const map = new Map();
  for (const p of properties) {
    const key = (p.building_name || '').toLowerCase().trim();
    if (key) map.set(key, p.rera_number || '');
  }
  return map;
}

// Strip "RERA ✓" from one_line_insight and highlight when the source property has no rera_number.
// This is a code-level guard because model instructions alone are unreliable.
function stripFalseRera(text, hasRera) {
  if (hasRera || !text) return text;
  return text
    .replace(/,?\s*RERA\s*[✓✔√]/g, '')
    .replace(/RERA\s*[✓✔√],?\s*/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function validateAndFixPropertyAnalysis(rawResponse, properties = []) {
  try {
    const parsed = safeParse(rawResponse);
    const reraLookup = buildReraLookup(properties);

    // Ensure overview is an array with correct shape — preserve all Phase 3 fields.
    // Drop padding "Unknown" entries the model sometimes adds to fill a count target.
    const overview = Array.isArray(parsed.overview)
      ? parsed.overview
          .filter(item => item.name && item.name !== 'Unknown' && item.price && item.price !== 'Contact for price')
          .map(item => {
            const reraNum = reraLookup.get((item.name || '').toLowerCase().trim()) ?? '';
            const hasRera = reraNum.length > 0;

            // Ensure a critical red_flag exists when RERA is missing
            let redFlags = Array.isArray(item.red_flags) ? [...item.red_flags] : [];
            if (!hasRera && !redFlags.some(f => /rera/i.test(f.flag || ''))) {
              redFlags.push({ flag: 'No RERA registration — legal compliance unverified', severity: 'critical' });
            }

            return {
              name:             item.name,
              price:            item.price            || 'Contact for price',
              area:             item.area             || 'N/A',
              location:         item.location         || '',
              highlight:        stripFalseRera(item.highlight        || '', hasRera),
              match_score:      typeof item.match_score === 'number' ? item.match_score : null,
              one_line_insight: stripFalseRera(item.one_line_insight || '', hasRera),
              red_flags:        redFlags,
              value_verdict:    ['good_deal', 'fair', 'overpriced'].includes(item.value_verdict)
                                  ? item.value_verdict : null,
              investment_horizon: item.investment_horizon || null,
              investment_reason:  item.investment_reason  || '',
              negotiation_tips:   Array.isArray(item.negotiation_tips) ? item.negotiation_tips : [],
              price_trend_context: item.price_trend_context || '',
            };
          })
      : properties.slice(0, 8).map(p => ({
          name:             p.building_name || 'Unknown',
          price:            p.price         || 'Contact for price',
          area:             p.area_sqft     || 'N/A',
          location:         p.location_address || '',
          highlight:        'Property details available',
          match_score:      null,
          one_line_insight: '',
          red_flags:        [],
          value_verdict:    null,
          investment_horizon: null,
          investment_reason:  '',
          negotiation_tips:   [],
          price_trend_context: '',
        }));

    // Strip false RERA claims from best_value.reason using the same lookup
    let bestValue = parsed.best_value || null;
    if (bestValue?.name && bestValue?.reason) {
      const reraNum = reraLookup.get((bestValue.name || '').toLowerCase().trim()) ?? '';
      bestValue = { ...bestValue, reason: stripFalseRera(bestValue.reason, reraNum.length > 0) };
    }

    // Derive best_value from highest match_score when model omits it (token exhaustion)
    if (!bestValue && overview.length > 0) {
      const top = overview.reduce((a, b) =>
        ((b.match_score || 0) > (a.match_score || 0) ? b : a)
      );
      const reraNum = reraLookup.get((top.name || '').toLowerCase().trim()) ?? '';
      const reraNote = reraNum ? 'RERA ✓' : 'verify RERA before booking';
      const verdict = top.value_verdict === 'good_deal' ? 'best value' : 'top ranked';
      bestValue = {
        name:   top.name,
        reason: `${verdict} at ${top.price} — ${top.one_line_insight || top.location}, ${reraNote}`,
      };
    }

    return {
      overview,
      best_value: bestValue,
      recommendations: Array.isArray(parsed.recommendations) && parsed.recommendations.length > 0
        && !parsed.recommendations.every(r => /contact us/i.test(r))
        ? parsed.recommendations
        : [
            `Prioritize RERA-registered properties — ${overview.filter(o => o.red_flags?.some(f => /rera/i.test(f.flag))).length} of ${overview.length} listed here are unregistered`,
            'Verify possession timelines for under-construction projects — request builder\'s track record',
            'Compare price_per_sqft against nearby completed projects before finalizing budget',
          ],
    };
  } catch (error) {
    console.error('[Validation] Property analysis parse failed:', error.message);
    return {
      error: 'Analysis format issue',
      overview: properties.slice(0, 8).map(p => ({
        name:             p.building_name || 'Unknown',
        price:            p.price         || 'Contact for price',
        area:             p.area_sqft     || 'N/A',
        location:         p.location_address || '',
        highlight:        'Property details available',
        match_score:      null,
        one_line_insight: '',
        red_flags:        [],
        value_verdict:    null,
        investment_horizon: null,
        investment_reason:  '',
        negotiation_tips:   [],
        price_trend_context: '',
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

    // Deduplicate trends by location name (model sometimes echoes the input array twice)
    const rawTrends = Array.isArray(parsed.trends) ? parsed.trends : [];
    const seenLocations = new Set();
    const dedupedTrends = rawTrends
      .map(t => ({
        location:          t.location || 'Unknown',
        price_per_sqft:    Number(t.price_per_sqft)    || 0,
        yearly_change_pct: Number(t.yearly_change_pct) || 0,
        rental_yield_pct:  Number(t.rental_yield_pct)  || 0,
        outlook:           t.outlook || '',
      }))
      .filter(t => {
        const key = t.location.toLowerCase().trim();
        // Drop padding entries the model sometimes adds (Unknown location or zero price)
        if (key === 'unknown' || key === '' || t.price_per_sqft === 0) return false;
        if (seenLocations.has(key)) return false;
        seenLocations.add(key);
        return true;
      });

    // Derive top_appreciation and best_rental_yield from data when model omits them
    let topAppreciation = parsed.top_appreciation || null;
    let bestRentalYield = parsed.best_rental_yield || null;

    if (!topAppreciation && dedupedTrends.length > 0) {
      const best = dedupedTrends.reduce((a, b) =>
        (b.yearly_change_pct || 0) > (a.yearly_change_pct || 0) ? b : a
      );
      if (best.yearly_change_pct > 0) {
        topAppreciation = {
          location: best.location,
          reason: `${best.yearly_change_pct}% YoY price growth — highest among tracked localities`,
        };
      }
    }

    if (!bestRentalYield && dedupedTrends.length > 0) {
      const best = dedupedTrends.reduce((a, b) =>
        (b.rental_yield_pct || 0) > (a.rental_yield_pct || 0) ? b : a
      );
      if (best.rental_yield_pct > 0) {
        bestRentalYield = {
          location: best.location,
          reason: `${best.rental_yield_pct}% rental yield — highest among tracked localities`,
        };
      }
    }

    return {
      trends: dedupedTrends,
      top_appreciation: topAppreciation,
      best_rental_yield: bestRentalYield,
      investment_tips: (() => {
        const tips = Array.isArray(parsed.investment_tips) ? parsed.investment_tips : [];
        const isGeneric = tips.length === 0 || tips.every(t => /contact us|personalized/i.test(t));
        if (!isGeneric) return tips;
        // Derive actionable tips from the actual trends data
        const sorted = [...dedupedTrends].sort((a, b) => (b.yearly_change_pct || 0) - (a.yearly_change_pct || 0));
        const topGrowth = sorted[0];
        const topYield  = [...dedupedTrends].sort((a, b) => (b.rental_yield_pct || 0) - (a.rental_yield_pct || 0))[0];
        const result = [];
        if (topGrowth?.yearly_change_pct > 0)
          result.push(`${topGrowth.location} shows the highest price growth (${topGrowth.yearly_change_pct}% YoY) — strong capital appreciation play`);
        if (topYield?.rental_yield_pct > 0 && topYield.location !== topGrowth?.location)
          result.push(`${topYield.location} offers the best rental yield at ${topYield.rental_yield_pct}% — suitable for buy-to-let investors`);
        result.push('Verify RERA registration and builder delivery track record before finalising any purchase');
        return result;
      })(),
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
