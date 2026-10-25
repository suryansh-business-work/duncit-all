import { buildPodCompleteInput, type PodCompleteValues } from '@duncit/forms/schemas';

import { type CompletePodInput } from '@/generated/graphql/graphql';

/**
 * The host's "Complete Pod" form. The contract — the venue's final bill a paid
 * venue pod must carry as proof (its total and the file), the extra charges
 * paid on top, the input it maps to — is `@duncit/forms/schemas`'
 * `pod-complete`, shared with mWeb (rule 27); this file only names the pod and
 * ties the input to the generated GraphQL type.
 */
export {
  blankPodCompleteValues,
  makePodCompleteSchema as buildPodCompleteSchema,
} from '@duncit/forms/schemas';
export type { PodCompleteValues };

export interface HostPodForComplete {
  id: string;
  pod_title: string;
  venue_id?: string | null;
  /** FREE / PAID — a free pod asks for no venue bill: its host settles the venue directly. */
  pod_type?: string | null;
}

/** Typed against the server's input, so a field the schema drops fails here. */
export const buildCompleteInput = (values: PodCompleteValues, podId: string): CompletePodInput =>
  buildPodCompleteInput(values, podId);
