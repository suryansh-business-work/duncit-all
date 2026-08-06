/**
 * What a phone number looks like, in one place.
 *
 * Checkout already enforced these two shapes and the door is about to enforce
 * the same ones on a companion's number — a second copy is how the two drift
 * into accepting different things for the same field (rule 34).
 */

/** Subscriber number: digits only, no separators, no country code. */
export const PHONE_NUMBER_REGEX = /^\d{6,15}$/;

/** Country calling code, with or without the leading `+`. */
export const PHONE_EXTENSION_REGEX = /^\+?\d{1,5}$/;
