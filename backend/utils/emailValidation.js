/**
 * Email Validation Utilities
 * Blocks disposable email domains to prevent fake registrations
 */

// Common disposable email providers
// Source: Disposable email providers list
const DISPOSABLE_DOMAINS = [
  // Popular temporary email services
  'tempmail.com', 'guerrillamail.com', 'mailinator.com', '10minutemail.com',
  'throwaway.email', 'temp-mail.org', 'getnada.com', 'maildrop.cc',
  'yopmail.com', 'fakeinbox.com', 'trashmail.com', 'discard.email',
  'sharklasers.com', 'guerrillamail.info', 'guerrillamail.net',
  'guerrillamail.org', 'guerrillamail.biz', 'spam4.me', 'grr.la',
  'guerrillamailblock.com', 'pokemail.net', 'spam4.me', 'trash-mail.at',
  '10minutesemail.net', '12minutemail.com', 'mailcatch.com',
  // Additional common ones
  'example.com', 'test.com', 'mail.com', 'inbox.com',
  'getairmail.com', 'mvrht.net', 'jourrapide.com', 'rhyta.com',
  'teleworm.us', 'dayrep.com', 'einrot.com', 'superrito.com',
  'cuvox.de', 'fleckens.hu', 'gustr.com', 'jourrapide.com'
];

/**
 * Check if an email domain is disposable/temporary
 * @param {string} email - The email address to check
 * @returns {boolean} - True if disposable, false otherwise
 */
export function isDisposableEmail(email) {
  if (!email || typeof email !== 'string') return false;

  // Extract domain from email
  const domain = email.toLowerCase().split('@')[1];
  if (!domain) return false;

  // Check if domain is in our blocklist
  return DISPOSABLE_DOMAINS.includes(domain);
}

/**
 * Validate email beyond just format
 * Checks for common fake patterns like repeated characters, obvious fakes, etc.
 * @param {string} email - The email address to validate
 * @returns {object} - { valid: boolean, reason?: string }
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, reason: 'Email is required' };
  }

  const emailLower = email.toLowerCase();
  const [localPart, domain] = emailLower.split('@');

  // Check for disposable domains
  if (isDisposableEmail(email)) {
    return {
      valid: false,
      reason: 'Temporary or disposable email addresses are not allowed. Please use a permanent email address.'
    };
  }

  // Check for obviously fake patterns
  const fakePatterns = [
    /^test/i,           // test@, testing@
    /^demo/i,           // demo@
    /^fake/i,           // fake@
    /^noreply/i,        // noreply@
    /^no-reply/i,       // no-reply@
    /^spam/i,           // spam@
    /^admin@example/i,  // admin@example
    /^user@example/i,   // user@example
  ];

  for (const pattern of fakePatterns) {
    if (pattern.test(email)) {
      return {
        valid: false,
        reason: 'Please use a valid email address'
      };
    }
  }

  // Check for suspicious patterns (all same characters in local part)
  if (localPart && localPart.length > 3) {
    const uniqueChars = new Set(localPart.replace(/[^a-z0-9]/g, '')).size;
    if (uniqueChars <= 2) {
      return {
        valid: false,
        reason: 'Please use a valid email address'
      };
    }
  }

  // Check for very short domains that are likely fake
  if (domain && domain.split('.')[0].length <= 2 ) {
    const tld = domain.split('.').pop();
    // Allow common 2-letter TLDs (like .co, .io, etc.), but not single letter
    if (domain.split('.')[0].length === 1 || (domain.split('.').length === 2 && domain.split('.')[0].length <= 2 && !['co', 'io', 'me', 'ai'].includes(tld))) {
      return {
        valid: false,
        reason: 'Please use a valid email address'
      };
    }
  }

  return { valid: true };
}

/**
 * Add a domain to the disposable list (runtime extension)
 * @param {string} domain - Domain to add
 */
export function addDisposableDomain(domain) {
  const lowerDomain = domain.toLowerCase();
  if (!DISPOSABLE_DOMAINS.includes(lowerDomain)) {
    DISPOSABLE_DOMAINS.push(lowerDomain);
  }
}
