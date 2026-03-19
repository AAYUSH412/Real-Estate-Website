/**
 * Simple Circuit Breaker Pattern Implementation
 *
 * Prevents cascading failures by tracking error rates and temporarily
 * blocking requests when a service is detected as unhealthy.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service is failing, requests are rejected immediately
 * - HALF_OPEN: Testing if service has recovered
 */

const CircuitState = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN'
};

class CircuitBreaker {
  constructor(options = {}) {
    // Configuration
    this.failureThreshold = options.failureThreshold || 5; // failures before opening
    this.timeout = options.timeout || 60000; // ms to wait before trying again (1 min default)
    this.monitor = options.monitor || 60000; // window to monitor failures (1 min default)
    this.name = options.name || 'Unknown';

    // State
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
    this.lastFailureTime = null;

    // Stats for monitoring
    this.stats = {
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      circuitOpened: 0,
      circuitClosed: 0
    };
  }

  /**
   * Execute a function with circuit breaker protection
   * @param {Function} fn - The function to execute
   * @returns {Promise} - Result of the function or circuit breaker error
   */
  async execute(fn) {
    this.stats.totalRequests++;

    // Check if circuit is open and if we should try again
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        throw new Error(`[CircuitBreaker:${this.name}] Circuit is OPEN. Service unavailable. Try again in ${Math.ceil((this.nextAttempt - Date.now()) / 1000)}s`);
      }
      // Time to test the service again
      this.state = CircuitState.HALF_OPEN;
      console.log(`[CircuitBreaker:${this.name}] Moving to HALF_OPEN state - testing service`);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Record a successful operation
   */
  onSuccess() {
    this.successCount++;
    this.stats.totalSuccesses++;

    if (this.state === CircuitState.HALF_OPEN) {
      // Service is working again, close the circuit
      this.reset();
      console.log(`[CircuitBreaker:${this.name}] Service recovered - circuit CLOSED`);
    }

    // Reset failure count if we've had success
    this.failureCount = 0;
  }

  /**
   * Record a failed operation
   */
  onFailure() {
    this.failureCount++;
    this.stats.totalFailures++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      // Still failing after test, open circuit again
      this.openCircuit();
    } else if (this.failureCount >= this.failureThreshold) {
      // Too many failures, open the circuit
      this.openCircuit();
    }
  }

  /**
   * Open the circuit breaker
   */
  openCircuit() {
    this.state = CircuitState.OPEN;
    this.nextAttempt = Date.now() + this.timeout;
    this.stats.circuitOpened++;

    console.warn(`[CircuitBreaker:${this.name}] Circuit OPENED after ${this.failureCount} failures. Will retry in ${this.timeout / 1000}s`);
  }

  /**
   * Reset the circuit breaker to closed state
   */
  reset() {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.stats.circuitClosed++;
  }

  /**
   * Get current circuit breaker status
   */
  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      nextAttempt: this.nextAttempt,
      lastFailureTime: this.lastFailureTime,
      stats: { ...this.stats }
    };
  }

  /**
   * Check if the circuit breaker is health (closed or success in half-open)
   */
  isHealthy() {
    return this.state === CircuitState.CLOSED ||
           (this.state === CircuitState.HALF_OPEN && this.successCount > 0);
  }

  /**
   * Force open the circuit (for testing or manual intervention)
   */
  forceOpen() {
    this.openCircuit();
  }

  /**
   * Force close the circuit (for testing or manual intervention)
   */
  forceClose() {
    this.reset();
  }
}

/**
 * Create a new circuit breaker instance
 * @param {Object} options - Configuration options
 * @returns {CircuitBreaker} - New circuit breaker instance
 */
export function createCircuitBreaker(options) {
  return new CircuitBreaker(options);
}

/**
 * Circuit breaker registry for managing multiple circuit breakers
 */
class CircuitBreakerRegistry {
  constructor() {
    this.breakers = new Map();
  }

  /**
   * Get or create a circuit breaker for a service
   */
  getBreaker(name, options = {}) {
    if (!this.breakers.has(name)) {
      const breakerOptions = { ...options, name };
      this.breakers.set(name, new CircuitBreaker(breakerOptions));
    }
    return this.breakers.get(name);
  }

  /**
   * Get status of all circuit breakers
   */
  getAll() {
    const status = {};
    this.breakers.forEach((breaker, name) => {
      status[name] = breaker.getStatus();
    });
    return status;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll() {
    this.breakers.forEach(breaker => breaker.reset());
  }
}

// Global registry instance
export const registry = new CircuitBreakerRegistry();

export default CircuitBreaker;