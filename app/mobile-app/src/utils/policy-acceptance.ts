/**
 * The two decisions the signup gate turns on, held once for both the form and
 * the Google pass. Deliberately NOT a `@duncit/*` package: it is ten lines used
 * in exactly two places, and rule 40 triggers at more than two — a package here
 * would cost 19 Dockerfile COPY lines whose omission only fails at deploy.
 *
 * Structural policy type, so this file never imports the generated operation.
 */
type Identified = { readonly id: string };

/**
 * Every listed policy has been ticked.
 *
 * Callers must check that the list has actually loaded first: an empty list is
 * vacuously accepted, which is right once the server has said nothing gates
 * signup and wrong while the request is still in flight.
 */
export function allPoliciesAccepted(
  policies: readonly Identified[],
  acceptedIds: readonly string[],
): boolean {
  return policies.every((policy) => acceptedIds.includes(policy.id));
}

/** Tick or untick one policy, keeping the accepted list a set. */
export function togglePolicyId(acceptedIds: readonly string[], id: string): string[] {
  if (acceptedIds.includes(id)) return acceptedIds.filter((accepted) => accepted !== id);
  return [...acceptedIds, id];
}
