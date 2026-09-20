import {
  participationInputFrom,
  podParticipationActions,
  type StatusTone,
} from '@duncit/utils';

import type { ClubPodAttendee } from '@/hooks/useClubPodDetail';
import type { Translate } from '@/i18n/fallback';

/**
 * What to call this person's booking, and how to tint it.
 *
 * WHICH state a booking is in comes from the shared
 * `podParticipationActions` — the same rule mWeb, the portals and the member's
 * own ticket apply — so an admin reading a complaint sees the word the member
 * is quoting. Only the mapping onto copy and a chip tone lives here.
 *
 * One literal key per state on purpose: `scripts/verify-translation-keys.mjs`
 * greps source for the literal string, so a key composed at runtime reads as
 * shipped-but-never-rendered.
 */
export function attendeeStatus(
  row: ClubPodAttendee,
  podDateTime: string | null | undefined,
  t: Translate,
): { label: string; tone: StatusTone } {
  if (row.status === 'BACKOUT_IN_PROCESS') {
    return { label: t('podDetailsPanel.podAttendeesSection.statusBackoutInProcess'), tone: 'warning' };
  }
  if (row.status === 'BACKED_OUT') {
    return { label: t('podDetailsPanel.podAttendeesSection.statusBackedOut'), tone: 'error' };
  }
  if (row.status === 'JOINED') {
    const gate = podParticipationActions(participationInputFrom(row.participation, podDateTime));
    if (gate.joinedLabelKind === 'VISITED') {
      return { label: t('podDetailsPanel.podAttendeesSection.statusVisited'), tone: 'success' };
    }
    return { label: t('podDetailsPanel.podAttendeesSection.statusJoined'), tone: 'success' };
  }
  if (row.is_host) {
    return { label: t('podDetailsPanel.podAttendeesSection.statusHost'), tone: 'info' };
  }
  return { label: t('podDetailsPanel.podAttendeesSection.statusAttendee'), tone: 'default' };
}
