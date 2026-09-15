import { GraphQLError } from 'graphql';

/**
 * The journeys a stress run can ask its bots to walk — NAMES only.
 *
 * The steps themselves (which page, which GraphQL documents) live beside the
 * runner in `scripts/stress/journeys.mjs`, because that is the code that sends
 * them. The two lists are kept in step the same way the E2E suites are: this
 * one validates what the portal may request, and the runner refuses a name it
 * has no steps for, so drift is a loud failure at the start of a run rather
 * than a journey that silently does nothing.
 *
 * Every journey is READ-ONLY and anonymous on purpose. A stress run may point
 * at production, and nothing it does may create a booking, a message or a row
 * a real person would later see.
 */
export const STRESS_JOURNEYS = [
  'app_boot',
  'auth',
  'home',
  'explore',
  'clubs',
  'search',
  'venues',
  'happening_nearby',
  'pod_detail',
  'club_detail',
  'venue_detail',
  'profile',
  'hosts_venues',
  'pod_ideas',
  'membership',
  'leaderboard',
  'gift_cards',
  'help',
  'api_health',
] as const;

export type StressJourney = (typeof STRESS_JOURNEYS)[number];

const KNOWN = new Set<string>(STRESS_JOURNEYS);

/** The requested journeys, deduplicated in catalogue order. Throws on an unknown name. */
export function normaliseJourneys(input: unknown): StressJourney[] {
  const requested = Array.isArray(input) ? input.map((j) => String(j).trim()).filter(Boolean) : [];
  const unknown = requested.filter((j) => !KNOWN.has(j));
  if (unknown.length > 0) {
    throw new GraphQLError(`Unknown journey: ${unknown.join(', ')}`, {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  if (requested.length === 0) {
    throw new GraphQLError('Pick at least one journey for the bots to walk.', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  return STRESS_JOURNEYS.filter((j) => requested.includes(j));
}
