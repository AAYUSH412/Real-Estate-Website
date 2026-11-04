# Local email configuration diagnosis — 4 November 2026

## Root cause

ESM evaluates imported modules before executing the body of `server.js`. Previously, the route graph imported `config/nodemailer.js` and constructed the `EmailService` singleton before `server.js` loaded `.env.local`. The adapter loaded only `.env`, printed a premature missing-key warning, and the singleton cached `noreply@buildestate.com` as its sender. Later imports loaded `.env.local`: the adapter's send-time key lookup then worked, while the singleton kept its earlier sender.

This explains the reported sequence: startup warning → API accepted a reset request → Brevo rejected the unverified fallback sender. A Brevo message ID establishes API acceptance, not delivery. The user's later production screenshot explicitly records Delivered with its configured/re-written sender; no Azure configuration change was needed. Host environment values exist before imports, unlike the previous late local-file load.

## Fix

- `config/environment.js` loads backend-relative files before eager configuration readers. Existing host values win, then non-production `.env.local`, then `.env` defaults. Tests skip automatic file loading to protect isolation.
- Server, email adapter, ImageKit, MongoDB, config and user controller import the shared loader instead of competing dotenv loads.
- `EmailService.fromAddress` reads `EMAIL_USER` when sending. No silent unverified sender fallback remains. The adapter rejects an absent sender before its provider call.
- Logs say accepted by Brevo, with delivery unverified, rather than implying inbox delivery.
- Expected expired public-user tokens return structured 401 without a stack trace. Unexpected session-store errors return retryable 503; admin middleware already followed this policy.

`EMAIL_USER` must identify a sender accepted by Brevo; the Gmail sender in the user's production evidence is rewritten by Brevo to its sending domain. Do not replace a working production sender or authenticate a domain you do not control. The account's authorized-IP banner does not explain this sender-specific rejection.

## Verification and boundaries

Tests mock provider HTTP and use isolated MongoDB. They cover env precedence/test isolation, dynamic sender selection, missing-sender failure, expired token responses and service-unavailable errors. A local read-only import confirmed key/sender presence without printing the key or sending email. No `.env.local` edits, provider messages, Azure settings or production deployment were made by this fix.

Restart the local backend normally to load the change, then request a fresh reset email and inspect the corresponding Brevo log. A rejected older request will remain rejected. Confirm the new request uses your configured sender and reaches Delivered; the application cannot guarantee delivery from the API response alone.

Admin refresh 401 immediately after logout or with no valid cookie is expected. `/api/users/me` belongs to public-user authentication, not `admin`: old browser tokens must refresh or require a fresh sign-in. Never extend JWT validity to hide expiry.
