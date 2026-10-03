import type { CloudflareRowState } from '@duncit/gql-types';

type Tone = 'success' | 'error' | 'warning';

/**
 * How loud each state is. A GoDaddy-only record is the one that goes dark the
 * moment the nameservers move — the failure this tab exists to catch — so it
 * is red. A Cloudflare-only record is not lost, but it starts answering after
 * the switch, so it is worth a look.
 */
export const ROW_TONE: Readonly<Record<CloudflareRowState, Tone>> = {
  BOTH: 'success',
  GODADDY_ONLY: 'error',
  CLOUDFLARE_ONLY: 'warning',
};

export const ROW_LABEL_KEY: Readonly<Record<CloudflareRowState, string>> = {
  BOTH: 'tech.cloudflare.stateBoth',
  GODADDY_ONLY: 'tech.cloudflare.stateGodaddyOnly',
  CLOUDFLARE_ONLY: 'tech.cloudflare.stateCloudflareOnly',
};
