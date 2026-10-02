/**
 * Pod slugs: slugify a title, find the next free slug within a club and insert
 * a pod while retrying a lost slug race.
 */
import { GraphQLError } from 'graphql';
import { PodModel } from './pod.model';
import { duplicateKeyOn } from '@utils/mongo-error';

/** The counter a repeated title's slug carries — `-2`, `-17`. */
const SLUG_SUFFIX_PATTERN = String.raw`(-\d+)?$`;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

/**
 * The next free slug under `base` inside one club.
 *
 * Pod TITLES are deliberately not unique — a club runs "Sunday Brunch" every
 * week, and two hosts may pick the same words on the same day — so the slug,
 * which IS unique per club because it addresses the pod in a URL, absorbs the
 * collision with a counter: `sunday-brunch`, `sunday-brunch-2`, and so on.
 *
 * Soft-deleted pods are counted. Their rows still hold the slug in the unique
 * index while the default read hook hides them, so a check that skipped them
 * passed and the insert behind it did not — which is exactly how a raw E11000
 * used to reach a host's screen.
 *
 * `base` comes out of `slugify`, so it is `[a-z0-9-]` and safe to put in a
 * pattern unescaped.
 */
async function nextFreePodSlug(clubId: unknown, base: string): Promise<string> {
  const siblings = await PodModel.find({
    club_id: clubId,
    pod_id: { $regex: `^${base}${SLUG_SUFFIX_PATTERN}` },
  })
    .setOptions({ includeDeleted: true })
    .select('pod_id')
    .lean();
  const taken = new Set(siblings.map((doc) => doc.pod_id));
  if (!taken.has(base)) return base;
  // Bounded by the number of slugs already sitting on this base, so the loop
  // always finds a gap and never runs past the pods the club actually owns.
  for (let n = 2; n <= taken.size + 1; n += 1) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-${taken.size + 1}`;
}

/** The new pod's slug: an explicit `pod_id` wins over the title, and both are
 * made unique inside the club rather than rejected. The `base` comes back with
 * it so a lost insert race can pick the next one again. */
export async function resolvePodSlugForCreate(input: any): Promise<{ slug: string; base: string }> {
  if (!input.club_id) {
    throw new GraphQLError('club_id is required', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  const base = input.pod_id?.trim()
    ? slugify(input.pod_id.trim())
    : slugify(input.pod_title ?? '');
  if (!base) {
    throw new GraphQLError('Pod title is required', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  return { slug: await nextFreePodSlug(input.club_id, base), base };
}

/** How many times a create may lose the slug race before it gives up. */
const SLUG_RACE_RETRIES = 3;

/**
 * Write the pod, letting the unique index — not a read taken a moment earlier —
 * have the last word on the slug.
 *
 * Two hosts publishing the same title in the same second both compute the same
 * next suffix, and one of the two inserts loses. The loser re-picks and tries
 * again instead of handing its host a duplicate-key error for a title it is
 * allowed to reuse.
 */
export async function insertPodWithFreeSlug(payload: any, clubId: unknown, base: string) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await PodModel.create(payload);
    } catch (error) {
      if (attempt >= SLUG_RACE_RETRIES || !duplicateKeyOn(error, 'pod_id')) throw error;
      payload.pod_id = await nextFreePodSlug(clubId, base);
    }
  }
}
