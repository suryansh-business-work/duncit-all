/**
 * Default distribution list for mobile-app build/release emails. Kept as a
 * single array so the whole team list lives in one place — a caller may still
 * override it per-send via the mutation's `recipients` input.
 */
export const RELEASE_NOTIFY_RECIPIENTS: string[] = [
  'admin@duncit.com',
  'prakhar@duncit.com',
  'ankush@duncit.com',
  'hello@duncit.com',
  'sangini@duncit.com',
];
