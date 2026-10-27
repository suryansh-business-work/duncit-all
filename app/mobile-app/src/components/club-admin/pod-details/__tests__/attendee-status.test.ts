import type { ClubPodAttendee } from '@/hooks/useClubPodDetail';
import type { Translate } from '@/i18n/fallback';
import { attendeeStatus } from '../attendee-status';

const t: Translate = (key) => key;
const PAST = '2020-01-01T10:00:00.000Z';
const FUTURE = '2999-01-01T10:00:00.000Z';
const K = 'podDetailsPanel.podAttendeesSection.';

const row = (patch: Record<string, unknown> = {}) =>
  ({
    status: 'CONFIRMED',
    is_host: false,
    participation: null,
    ...patch,
  }) as unknown as ClubPodAttendee;

describe('attendeeStatus', () => {
  it('flags a backout that is still being processed as a warning', () => {
    expect(attendeeStatus(row({ status: 'BACKOUT_IN_PROCESS' }), PAST, t)).toEqual({
      label: `${K}statusBackoutInProcess`,
      tone: 'warning',
    });
  });

  it('flags a completed backout as an error', () => {
    expect(attendeeStatus(row({ status: 'BACKED_OUT' }), PAST, t)).toEqual({
      label: `${K}statusBackedOut`,
      tone: 'error',
    });
  });

  it('calls a joined member who attended a pod that has passed visited', () => {
    expect(
      attendeeStatus(row({ status: 'JOINED', participation: { attended: true } }), PAST, t),
    ).toEqual({ label: `${K}statusVisited`, tone: 'success' });
  });

  it('calls a joined member joined when the pod is still ahead, even if marked attended', () => {
    expect(
      attendeeStatus(row({ status: 'JOINED', participation: { attended: true } }), FUTURE, t),
    ).toEqual({ label: `${K}statusJoined`, tone: 'success' });
  });

  it('calls a joined member who never attended joined', () => {
    expect(
      attendeeStatus(row({ status: 'JOINED', participation: { attended: false } }), PAST, t),
    ).toEqual({
      label: `${K}statusJoined`,
      tone: 'success',
    });
    expect(attendeeStatus(row({ status: 'JOINED' }), null, t).label).toBe(`${K}statusJoined`);
  });

  it('calls a joined member whose pod was cancelled joined, not visited', () => {
    expect(
      attendeeStatus(
        row({
          status: 'JOINED',
          participation: { attended: true, pod_cancelled_by: 'HOST', pod_cancelled_at: PAST },
        }),
        PAST,
        t,
      ).label,
    ).toBe(`${K}statusJoined`);
  });

  it('labels a host who has no booking state as the host', () => {
    expect(attendeeStatus(row({ is_host: true }), PAST, t)).toEqual({
      label: `${K}statusHost`,
      tone: 'info',
    });
  });

  it('labels anyone else as an attendee', () => {
    expect(attendeeStatus(row(), PAST, t)).toEqual({
      label: `${K}statusAttendee`,
      tone: 'default',
    });
  });
});
