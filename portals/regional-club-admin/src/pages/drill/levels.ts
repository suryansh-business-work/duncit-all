/**
 * One drill-down, three levels deep, in one drawer.
 *
 * A Regional Club Admin reaches a pod two ways — down the canvas (a Host's
 * pods) and down the list (a Club Admin's clubs, then a club's pods) — and both
 * end at the same pod detail page. Modelling that as a STACK rather than as
 * three drawers is what lets Back mean "up one level" everywhere and keeps the
 * two entry points from growing separate implementations.
 */
export type DrillLevel =
  | { kind: 'CLUBS'; id: string; label: string }
  | { kind: 'CLUB_PODS'; id: string; label: string }
  | { kind: 'HOST_PODS'; id: string; label: string };

/** The subtitle under the drawer's title, per level. */
export const LEVEL_SUBTITLE_KEYS: Readonly<Record<DrillLevel['kind'], string>> = {
  CLUBS: 'partners.regional.clubsOfSubtitle',
  CLUB_PODS: 'partners.regional.podsOfSubtitle',
  HOST_PODS: 'partners.regional.hostPodsSubtitle',
};
