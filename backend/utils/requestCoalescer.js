/**
 * Request Coalescer - Prevents duplicate in-flight requests
 *
 * Problem: Two users click search at the exact same second → both hit API
 * before cache is set, wasting API credits.
 *
 * Solution: Queue identical in-flight requests. The second request waits
 * for the first to complete and reuses its result.
 */

const inFlight = new Map();

/**
 * Coalesce identical requests - if a request with the same key is already
 * in-flight, wait for it instead of making a duplicate request.
 *
 * @param {string} key - Unique key identifying the request (e.g., cache key)
 * @param {Function} fetchFn - Async function that performs the actual request
 * @returns {Promise<any>} - Result from fetchFn (shared if coalesced)
 */
export async function coalesce(key, fetchFn) {
  // If same request is already in-flight, wait for it
  if (inFlight.has(key)) {
    console.log(`[Coalesce] Waiting for in-flight request: ${key.substring(0, 50)}...`);
    return inFlight.get(key);
  }

  // Otherwise, start the request and store the promise
  const promise = fetchFn()
    .finally(() => {
      // Remove from in-flight after completion (with small delay to handle race conditions)
      setTimeout(() => inFlight.delete(key), 100);
    });

  inFlight.set(key, promise);
  console.log(`[Coalesce] Started new request: ${key.substring(0, 50)}...`);

  return promise;
}

/**
 * Get current number of in-flight requests (for monitoring/debugging)
 */
export function getInFlightCount() {
  return inFlight.size;
}

/**
 * Clear all in-flight requests (for testing/cleanup)
 */
export function clearInFlight() {
  inFlight.clear();
}
