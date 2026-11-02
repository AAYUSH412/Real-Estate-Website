export function pagination(query = {}, defaultLimit = 20) {
  const positive = (value, fallback) => /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : fallback;
  const page = Math.min(positive(query.page, 1), 1_000_000);
  const limit = Math.min(positive(query.limit, defaultLimit), 100);
  return { page, limit, skip: (page - 1) * limit };
}

export function pageMetadata(totalProperties, page, limit) {
  const totalPages = Math.ceil(totalProperties / limit);
  return { currentPage: page, limit, totalProperties, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 };
}

export const escapeRegex = value => String(value).slice(0, 200).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
