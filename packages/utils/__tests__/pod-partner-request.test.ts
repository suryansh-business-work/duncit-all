import { describe, expect, it } from 'vitest';
import {
  POD_REQUEST_DEFAULT_RADIUS_KM,
  POD_REQUEST_MAX_RADIUS_KM,
  clampPodRequestRadius,
  formatPodRequestKm,
  podRequestCounterpart,
  podRequestNextAction,
  podRequestSender,
  podRequestStatusLabel,
  podRequestStatusTone,
  sentByViewer,
  splitPodRequests,
  widerPodRequestRadius,
  type PodRequestLike,
  type PodRequestStatus,
} from '../src/pod-partner-request';

const req = (
  status: PodRequestStatus,
  viewer_side: 'HOST' | 'VENUE',
  direction: 'VENUE_TO_HOST' | 'HOST_TO_VENUE' = 'VENUE_TO_HOST'
): PodRequestLike => ({ status, viewer_side, direction });

describe('podRequestSender / sentByViewer', () => {
  it('names the venue as sender of VENUE_TO_HOST and the host of HOST_TO_VENUE', () => {
    expect(podRequestSender('VENUE_TO_HOST')).toBe('VENUE');
    expect(podRequestSender('HOST_TO_VENUE')).toBe('HOST');
  });

  it('is true only for the side that sent it', () => {
    expect(sentByViewer(req('REQUESTED', 'VENUE'))).toBe(true);
    expect(sentByViewer(req('REQUESTED', 'HOST'))).toBe(false);
    expect(sentByViewer(req('REQUESTED', 'HOST', 'HOST_TO_VENUE'))).toBe(true);
  });
});

describe('podRequestNextAction', () => {
  it('lets the receiver answer and the sender withdraw a new request', () => {
    expect(podRequestNextAction(req('REQUESTED', 'HOST'))).toBe('RESPOND');
    expect(podRequestNextAction(req('REQUESTED', 'VENUE'))).toBe('WITHDRAW');
  });

  it('has the receiver pick the slot and the sender confirm it, in both directions', () => {
    expect(podRequestNextAction(req('ACCEPTED', 'HOST'))).toBe('PICK_SLOT');
    expect(podRequestNextAction(req('ACCEPTED', 'VENUE'))).toBe('WAIT_SLOT');
    expect(podRequestNextAction(req('SLOT_REQUESTED', 'VENUE'))).toBe('CONFIRM_SLOT');
    expect(podRequestNextAction(req('SLOT_REQUESTED', 'HOST'))).toBe('WAIT_CONFIRM');
    expect(podRequestNextAction(req('ACCEPTED', 'VENUE', 'HOST_TO_VENUE'))).toBe('PICK_SLOT');
    expect(podRequestNextAction(req('SLOT_REQUESTED', 'HOST', 'HOST_TO_VENUE'))).toBe('CONFIRM_SLOT');
  });

  it('always has the host create the pod once the slot is confirmed', () => {
    expect(podRequestNextAction(req('SLOT_CONFIRMED', 'HOST'))).toBe('CREATE_POD');
    expect(podRequestNextAction(req('SLOT_CONFIRMED', 'HOST', 'HOST_TO_VENUE'))).toBe('CREATE_POD');
    expect(podRequestNextAction(req('SLOT_CONFIRMED', 'VENUE'))).toBe('HOST_CREATES');
  });

  it('ends at DONE with a pod and CLOSED otherwise', () => {
    expect(podRequestNextAction(req('POD_CREATED', 'VENUE'))).toBe('DONE');
    for (const status of ['REJECTED', 'CANCELLED', 'EXPIRED'] as const) {
      expect(podRequestNextAction(req(status, 'HOST'))).toBe('CLOSED');
    }
  });
});

describe('splitPodRequests', () => {
  it('files received requests by status and keeps everything sent together', () => {
    const incoming = req('REQUESTED', 'HOST');
    const accepted = [req('ACCEPTED', 'HOST'), req('SLOT_REQUESTED', 'HOST'), req('SLOT_CONFIRMED', 'HOST'), req('POD_CREATED', 'HOST')];
    const closed = [req('REJECTED', 'HOST'), req('CANCELLED', 'HOST'), req('EXPIRED', 'HOST')];
    const sent = [req('REQUESTED', 'HOST', 'HOST_TO_VENUE'), req('REJECTED', 'HOST', 'HOST_TO_VENUE')];
    const split = splitPodRequests([incoming, ...accepted, ...closed, ...sent]);
    expect(split.incoming).toEqual([incoming]);
    expect(split.accepted).toEqual(accepted);
    expect(split.sent).toEqual(sent);
  });

  it('returns three empty lists for nothing', () => {
    expect(splitPodRequests([])).toEqual({ incoming: [], accepted: [], sent: [] });
  });
});

describe('podRequestStatusLabel', () => {
  it('maps every status to its own literal key', () => {
    const t = (key: string) => key;
    expect(
      (['REQUESTED', 'ACCEPTED', 'SLOT_REQUESTED', 'SLOT_CONFIRMED', 'POD_CREATED', 'REJECTED', 'CANCELLED', 'EXPIRED'] as const).map(
        (status) => podRequestStatusLabel(status, t)
      )
    ).toEqual([
      'podRequests.statusRequested',
      'podRequests.statusAccepted',
      'podRequests.statusSlotRequested',
      'podRequests.statusSlotConfirmed',
      'podRequests.statusPodCreated',
      'podRequests.statusRejected',
      'podRequests.statusCancelled',
      'podRequests.statusExpired',
    ]);
  });
});

describe('podRequestStatusTone', () => {
  it('is success once confirmed, neutral once over, warning while in flight', () => {
    expect(podRequestStatusTone('SLOT_CONFIRMED')).toBe('success');
    expect(podRequestStatusTone('POD_CREATED')).toBe('success');
    expect(podRequestStatusTone('REJECTED')).toBe('neutral');
    expect(podRequestStatusTone('CANCELLED')).toBe('neutral');
    expect(podRequestStatusTone('EXPIRED')).toBe('neutral');
    expect(podRequestStatusTone('REQUESTED')).toBe('warning');
    expect(podRequestStatusTone('SLOT_REQUESTED')).toBe('warning');
  });
});

describe('radius helpers', () => {
  it('clamps into 0–10 and falls back to 5 for anything unusable', () => {
    expect(clampPodRequestRadius(3)).toBe(3);
    expect(clampPodRequestRadius('7.5')).toBe(7.5);
    expect(clampPodRequestRadius(-2)).toBe(0);
    expect(clampPodRequestRadius(40)).toBe(POD_REQUEST_MAX_RADIUS_KM);
    expect(clampPodRequestRadius('far')).toBe(POD_REQUEST_DEFAULT_RADIUS_KM);
    expect(clampPodRequestRadius(undefined)).toBe(POD_REQUEST_DEFAULT_RADIUS_KM);
  });

  it('offers the full radius until the search is already at it', () => {
    expect(widerPodRequestRadius(POD_REQUEST_DEFAULT_RADIUS_KM)).toBe(POD_REQUEST_MAX_RADIUS_KM);
    expect(widerPodRequestRadius(POD_REQUEST_MAX_RADIUS_KM)).toBeNull();
  });
});

describe('podRequestCounterpart', () => {
  it('shows a host the venue, with category and place', () => {
    expect(
      podRequestCounterpart({
        viewer_side: 'HOST',
        venue: { venue_name: 'Flow Sports', cover_image_url: 'c.jpg', category: 'Sports', locality: 'HSR', city: 'Bengaluru' },
        host: { name: 'Meera', photo_url: 'm.jpg', categories: ['Board games'] },
      })
    ).toEqual({ kind: 'VENUE', name: 'Flow Sports', imageUrl: 'c.jpg', subtitle: 'Sports · HSR · Bengaluru' });
  });

  it('shows a venue owner the host, with their categories', () => {
    expect(
      podRequestCounterpart({ viewer_side: 'VENUE', host: { name: 'Meera', photo_url: 'm.jpg', categories: ['Chess', 'Quiz'] } })
    ).toEqual({ kind: 'HOST', name: 'Meera', imageUrl: 'm.jpg', subtitle: 'Chess · Quiz' });
  });

  it('falls back to blanks when the summary is missing, skipping empty parts', () => {
    expect(podRequestCounterpart({ viewer_side: 'HOST', venue: null })).toEqual({ kind: 'VENUE', name: '', imageUrl: '', subtitle: '' });
    expect(podRequestCounterpart({ viewer_side: 'VENUE', host: null })).toEqual({ kind: 'HOST', name: '', imageUrl: '', subtitle: '' });
    expect(
      podRequestCounterpart({ viewer_side: 'HOST', venue: { venue_name: 'X', category: '', locality: null, city: 'Pune' } }).subtitle
    ).toBe('Pune');
  });
});

describe('formatPodRequestKm', () => {
  it('rounds to one decimal and drops a trailing .0', () => {
    expect(formatPodRequestKm(2.46)).toBe('2.5');
    expect(formatPodRequestKm(3)).toBe('3');
    expect(formatPodRequestKm(0)).toBe('0');
  });
});
