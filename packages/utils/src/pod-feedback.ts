/**
 * Rating a pod — the framework-free half, shared by mWeb and the native app
 * (rules 27/40).
 *
 * A pod is not one experience: the evening, the host, the room, the club admin
 * behind it, whether people felt safe and what they were given to eat are all
 * separate things a guest can feel differently about. The server decides which
 * of them a given pod even HAS; this module owns the order they are asked in,
 * which translation key names each one, and how the answers become a mutation
 * input — so the two surfaces cannot drift into asking different questions.
 */

export type PodFeedbackAspect =
  | 'OVERALL'
  | 'HOST'
  | 'VENUE'
  | 'CLUB_ADMIN'
  | 'SAFETY'
  | 'FOOD'
  | 'OTHER';

/** The asking order. OVERALL leads: it is the one question that is required. */
export const POD_FEEDBACK_ASPECTS: readonly PodFeedbackAspect[] = [
  'OVERALL',
  'HOST',
  'VENUE',
  'CLUB_ADMIN',
  'SAFETY',
  'FOOD',
  'OTHER',
];

/**
 * The label each aspect renders under. Keys, not copy — the words live in the
 * localization bundle (rule 38), so a Hindi guest is asked in Hindi.
 */
export const POD_FEEDBACK_ASPECT_KEY: Record<PodFeedbackAspect, string> = {
  OVERALL: 'mweb.podFeedback.aspectOverall',
  HOST: 'mweb.podFeedback.aspectHost',
  VENUE: 'mweb.podFeedback.aspectVenue',
  CLUB_ADMIN: 'mweb.podFeedback.aspectClubAdmin',
  SAFETY: 'mweb.podFeedback.aspectSafety',
  FOOD: 'mweb.podFeedback.aspectFood',
  OTHER: 'mweb.podFeedback.aspectOther',
};

/**
 * The same labels in plain English, for the ADMIN-side surfaces that read
 * ratings back. The portals render English today, so they cannot use the keys
 * above — but they can share this list, which is what stops a fourth spelling
 * of "Club admin" appearing the next time a portal shows a rating.
 */
export const POD_FEEDBACK_ASPECT_LABEL: Record<PodFeedbackAspect, string> = {
  OVERALL: 'Overall',
  HOST: 'Host',
  VENUE: 'Venue',
  CLUB_ADMIN: 'Club admin',
  SAFETY: 'Safety',
  FOOD: 'Food',
  OTHER: 'Other',
};

/** What the guest has scored so far, aspect by aspect. */
export type PodFeedbackScores = Partial<Record<PodFeedbackAspect, number>>;

const KNOWN = new Set<string>(POD_FEEDBACK_ASPECTS);

/**
 * The aspects to ask, from whatever the server sent: unknown names dropped (a
 * new one released server-first must not render as a blank row), duplicates
 * collapsed, always in the asking order, and always including OVERALL — a
 * feedback form with nothing required cannot be submitted at all.
 */
export function orderedAspects(fromServer: readonly string[] | null | undefined): PodFeedbackAspect[] {
  const asked = new Set<PodFeedbackAspect>(['OVERALL']);
  for (const aspect of fromServer ?? []) {
    if (KNOWN.has(aspect)) asked.add(aspect as PodFeedbackAspect);
  }
  return POD_FEEDBACK_ASPECTS.filter((aspect) => asked.has(aspect));
}

/** Only the overall score is required; the rest are there for whoever has an opinion. */
export const canSubmitPodFeedback = (scores: PodFeedbackScores): boolean =>
  (scores.OVERALL ?? 0) > 0;

/**
 * Where a pod's rating form lives on the web — the link a host shares with the
 * people who came. One shape, so the mWeb route, the native deep link and the
 * message the host sends can never point at three different places.
 */
export const podFeedbackPath = (podId: string): string => `/pod/${podId}/feedback`;

/** The same path as a full URL, for a message that leaves the app. */
export const podFeedbackLink = (podId: string, baseUrl: string): string =>
  `${baseUrl}${podFeedbackPath(podId)}`;

/** A rating the guest has already left, as the server returns it. */
export interface MyPodFeedback {
  rating: number;
  ratings: ReadonlyArray<{ aspect: string; rating: number }>;
  message: string;
}

/**
 * A previous rating, back in the shape the form renders from — so following
 * the link a second time shows the guest their own stars instead of a blank
 * form that would silently overwrite them.
 */
export function scoresFromMyFeedback(mine: MyPodFeedback | null | undefined): PodFeedbackScores {
  if (!mine) return {};
  const scores: PodFeedbackScores = { OVERALL: mine.rating };
  for (const entry of mine.ratings) {
    if (KNOWN.has(entry.aspect)) scores[entry.aspect as PodFeedbackAspect] = entry.rating;
  }
  return scores;
}

/**
 * What a guest chose when they closed the rating prompt without answering it.
 * The server holds the answer, so it survives a reload — which is the whole
 * point: an in-memory dismiss asks the same question again on the next screen.
 */
export type PodFeedbackReminderChoice = 'LATER' | 'NEVER';

/**
 * The two ways out of the prompt, in the order they are offered, keyed to the
 * words rather than carrying them (rule 38). Shared so mWeb and the native app
 * cannot end up offering different escapes from the same dialog.
 */
export const POD_FEEDBACK_REMINDER_OPTIONS: ReadonlyArray<{
  choice: PodFeedbackReminderChoice;
  labelKey: string;
}> = [
  { choice: 'LATER', labelKey: 'mweb.podFeedback.remindLater' },
  { choice: 'NEVER', labelKey: 'mweb.podFeedback.remindNever' },
];

export interface PodFeedbackInput {
  pod_id: string;
  rating: number;
  message: string | null;
  ratings: Array<{ aspect: PodFeedbackAspect; rating: number }>;
}

/**
 * The submit payload. OVERALL travels on `rating` because every rating ever
 * written has one there; the rest travel as a list, and an aspect the guest
 * left alone is simply absent rather than sent as a zero.
 */
export function buildPodFeedbackInput(args: {
  podId: string;
  scores: PodFeedbackScores;
  message: string;
  aspects: readonly PodFeedbackAspect[];
}): PodFeedbackInput {
  const ratings = args.aspects
    .filter((aspect) => aspect !== 'OVERALL' && (args.scores[aspect] ?? 0) > 0)
    .map((aspect) => ({ aspect, rating: args.scores[aspect] as number }));

  return {
    pod_id: args.podId,
    rating: args.scores.OVERALL ?? 0,
    message: args.message.trim() || null,
    ratings,
  };
}
