import type { SignupPolicy } from './useSignupPolicies';

/*
  Which app the acceptance was given in. Both signup doors stamp the same value,
  so an auditor reading the Legal log can tell a phone browser from the native
  app without inferring it from a user agent nobody stored.
*/
export const ACCEPTANCE_SURFACE = 'MWEB';

/**
 * The two decisions the gate makes, kept apart from the UI that renders them.
 *
 * They are duplicated in the native app rather than shared through a package on
 * purpose (rule 40 triggers at MORE than two call sites): this is ten lines used
 * in exactly two apps, against a nineteen-line Dockerfile COPY cost whose
 * omission only shows up at deploy.
 */

/** Every listed policy ticked — what the signup button is waiting on. */
export function isEveryPolicyAccepted(
  policies: readonly SignupPolicy[],
  accepted: readonly string[],
): boolean {
  const ticked = new Set(accepted);
  return policies.every((policy) => ticked.has(policy.id));
}

/**
 * One row ticked or unticked.
 *
 * Filtering before appending keeps the call idempotent, so a double-fire from a
 * label click cannot leave the same id in the list twice and skew the count.
 */
export function toggleAccepted(
  accepted: readonly string[],
  id: string,
  next: boolean,
): string[] {
  const without = accepted.filter((value) => value !== id);
  return next ? [...without, id] : without;
}
