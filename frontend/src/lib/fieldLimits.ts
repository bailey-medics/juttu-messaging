/**
 * The most characters the fields that matter most will take. Ported from
 * Quill Medical's, keeping the limits the ported form fields use.
 *
 * Quill's backend enforces the same numbers, refusing a longer value with a
 * 422. Juttu's backend has no accounts yet; when the vision plan's Phase 8
 * adds them, it enforces these too. Change one and change the other.
 */

/** An email address. */
export const MAX_EMAIL = 255;

/** A password. Far longer than any passphrase. */
export const MAX_PASSWORD = 128;
