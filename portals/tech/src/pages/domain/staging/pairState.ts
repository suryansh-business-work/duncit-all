import type { DnsPairState } from '@duncit/gql-types';

type Tone = 'success' | 'error' | 'warning';

/**
 * How loud each mismatch is.
 *
 * A host production answers for and staging does not is the failure this page
 * was built to catch — a release is verified against a URL that resolves
 * nowhere — so it is the red one. The other two are wrong but not silent: a
 * staging-only host is leftovers, and two different addresses at least both
 * answer.
 */
export const PAIR_TONE: Readonly<Record<DnsPairState, Tone>> = {
  MATCHED: 'success',
  MISSING_STAGING: 'error',
  MISSING_PRODUCTION: 'warning',
  VALUE_DIFFERS: 'warning',
};

/** Translation key for a state's chip label. */
export const PAIR_LABEL_KEY: Readonly<Record<DnsPairState, string>> = {
  MATCHED: 'tech.dnsStaging.stateMatched',
  MISSING_STAGING: 'tech.dnsStaging.stateMissingStaging',
  MISSING_PRODUCTION: 'tech.dnsStaging.stateMissingProduction',
  VALUE_DIFFERS: 'tech.dnsStaging.stateDiffers',
};

/** A state a sync would change. MATCHED is already right; MISSING_PRODUCTION has nothing to copy. */
export const isFixableState = (state: DnsPairState): boolean =>
  state === 'MISSING_STAGING' || state === 'VALUE_DIFFERS';
