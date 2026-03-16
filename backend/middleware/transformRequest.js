/**
 * Transform the frontend's AI search request to the backend format.
 *
 * Frontend sends:
 *   { city, locality, price: { min, max }, type, category, bhk, possession }
 *
 * Backend expects:
 *   { city, locality, bhk, minPrice, maxPrice (Crores string),
 *     propertyType, propertyCategory, possession, limit }
 */
export const transformAISearchRequest = (req, res, next) => {
  const { city, locality, price, type, category, bhk, possession, includeNoBroker } = req.body;

  // Convert price from absolute INR to Crores (1 Cr = 1,00,00,000)
  let maxPriceInCr = '5';
  let minPriceInCr = '0';
  if (price?.max) maxPriceInCr = (price.max / 10_000_000).toFixed(2);
  if (price?.min) minPriceInCr = (price.min / 10_000_000).toFixed(2);

  // Map frontend "type" values to the canonical property types used by firecrawlService.
  // Valid values: Flat | House | Villa | Plot | Penthouse | Studio | Commercial
  const typeMap = {
    Flat: 'Flat', Villa: 'Villa', House: 'House', Plot: 'Plot',
    Penthouse: 'Penthouse', Studio: 'Studio',
    Modern: 'Flat', Apartment: 'Flat', Independent: 'House',
    'Independent House': 'House', 'Studio Apartment': 'Studio',
    'Residential Land': 'Plot', Commercial: 'Commercial',
  };

  req.body = {
    city:             city || req.body.city,
    locality:         locality || '',
    bhk:              bhk || 'Any',
    minPrice:         minPriceInCr,
    maxPrice:         maxPriceInCr,
    propertyType:     typeMap[type] || type || 'Flat',
    propertyCategory: category || 'Residential',
    possession:       possession || 'any',
    includeNoBroker:  includeNoBroker === true || includeNoBroker === 'true',
    limit:            req.body.limit || 12,
  };

  next();
};
