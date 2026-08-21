/**
 * The client half of pod content moderation, in one dependency-free place.
 *
 * Every surface that writes a pod's title, description, extra info, hashtags or
 * media faces the same server rules: the create-pod stepper on mWeb and native,
 * the host's edit dialog on both, and the Admin / Club Admin pod editors. They
 * all need the same two things — which form field a flagged server `field`
 * belongs to, and how to read the violations back off a rejected mutation — so
 * neither answer is written twice (rule 40).
 */

/** One violation as the server returns it (moderatePodContent, or the
 * `POD_CONTENT_REJECTED` extensions of a refused write). */
export interface PodContentViolation {
  field: string;
  step?: string;
  type: string;
  message: string;
  evidence?: string | null;
}

/** Maps a server moderation `field` onto the form field that holds it. Media
 * violations arrive as `image` because one gallery is one input. */
export const POD_MODERATION_FIELD_MAP: Record<string, string> = {
  pod_title: 'pod_title',
  pod_description: 'pod_description',
  pod_info: 'pod_info',
  pod_hashtag: 'pod_hashtag_text',
  image: 'media_text',
};

/** The form field a violation belongs to; unknown fields fall to the title so a
 * violation is always shown somewhere rather than swallowed. */
export const podModerationFormField = (field: string): string =>
  POD_MODERATION_FIELD_MAP[field] ?? 'pod_title';

/** The code the server attaches to a write it refused on content grounds. */
export const POD_CONTENT_REJECTED = 'POD_CONTENT_REJECTED';

/**
 * The gallery URLs a moderation preflight sends as `image_urls`. Videos are
 * left out because the vision model is handed each URL as a picture — a clip
 * it cannot decode fails the whole call rather than one item. Built from the
 * media list the form already assembles, so no surface re-derives which of its
 * lines is a video.
 */
export const podModerationImageUrls = (
  media: ReadonlyArray<{ url: string; type?: string | null }>
): string[] => media.filter((item) => item.type !== 'VIDEO').map((item) => item.url);

type RejectionExtensions = { code?: string; violations?: unknown } | null | undefined;

/** Both client shapes at once: Apollo hangs the extensions off each
 * `graphQLErrors` entry, while the native app's ApiError carries the first
 * error's extensions flat on the error itself. */
type RejectionShape = {
  message?: string;
  extensions?: RejectionExtensions;
  graphQLErrors?: ReadonlyArray<{ message?: string; extensions?: RejectionExtensions }>;
};

const isViolation = (value: unknown): value is PodContentViolation => {
  const v = value as PodContentViolation | null;
  return !!v && typeof v.field === 'string' && typeof v.message === 'string';
};

/**
 * The violations behind a refused pod write, or [] for any other failure. The
 * error shape is typed structurally so this package never depends on Apollo —
 * the native app throws the same extensions through its own GraphQL client.
 */
export function podContentViolationsOf(err: unknown): PodContentViolation[] {
  const shape = err as RejectionShape | null;
  const candidates: RejectionExtensions[] = [
    shape?.extensions,
    ...(shape?.graphQLErrors ?? []).map((item) => item?.extensions),
  ];
  for (const extensions of candidates) {
    if (extensions?.code !== POD_CONTENT_REJECTED) continue;
    if (Array.isArray(extensions.violations)) return extensions.violations.filter(isViolation);
  }
  return [];
}

/**
 * A refused write as one readable block: the server's headline, then one line
 * per rule broken. Used where a surface has a single error slot rather than
 * per-field errors (the portal pod editors).
 */
export function podContentRejectionMessage(err: unknown): string | null {
  const violations = podContentViolationsOf(err);
  if (violations.length === 0) return null;
  const headline = (err as RejectionShape)?.message ?? 'Your pod content violates the community guidelines';
  const lines = violations.map((v) => {
    const evidence = v.evidence ? ` ("${v.evidence}")` : '';
    return `• ${v.message}${evidence}`;
  });
  return [headline, ...lines].join('\n');
}
