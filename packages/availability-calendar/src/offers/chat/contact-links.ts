/**
 * A phone number as a dialable `tel:` target: its digits and a leading +,
 * nothing else. `replace(/g)` rather than `replaceAll` — this package's
 * tsconfig lib predates ES2021.
 */
export const telHref = (phone: string): string => `tel:${phone.replace(/[^\d+]/g, '')}`;
