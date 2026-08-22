/**
 * A colliding slot is the one create failure the partner can resolve on the
 * spot — by overwriting what is already published for that space and time. The
 * server answers it with the CONFLICT code, so that code is what the editor
 * offers the overwrite on; every other failure is just an error.
 */
export function isSlotConflictError(error: unknown): boolean {
  const graphQLErrors = (
    error as { graphQLErrors?: ReadonlyArray<{ extensions?: { code?: unknown } }> } | null
  )?.graphQLErrors;
  return Boolean(graphQLErrors?.some((e) => e.extensions?.code === 'CONFLICT'));
}
