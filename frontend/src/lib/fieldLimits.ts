/**
 * The most characters the fields that matter most will take. Ported from
 * Quill Medical's, keeping the limits the ported form fields use.
 *
 * Quill's backend enforces the same numbers, refusing a longer value with a
 * 422. Juttu's backend enforces the username's, in `SignInSerializer` and the
 * `User` model. Change one and change the other.
 */

/** A username. The backend's `User.username` takes 150 characters. */
export const MAX_USERNAME = 150;

/** An email address. */
export const MAX_EMAIL = 255;

/** A password. Far longer than any passphrase. */
export const MAX_PASSWORD = 128;
