import { describe, expect, it } from 'vitest';
import {
  approvalBadge,
  mailtoUrl,
  pendingPodImage,
  podPendingStatus,
  telUrl,
  venueMapUrl,
  whatsappUrl,
} from '../podPending';

const venue = {
  venue_id: 'v1',
  venue_name: 'The Loft',
  contact_person: null,
  phone: null,
  email: null,
  address: '12 Main St',
  lat: null as number | null,
  lng: null as number | null,
};

describe('pod-pending helpers (native twin, rule 27)', () => {
  it('prefers the first IMAGE, else the first media item', () => {
    expect(pendingPodImage([{ url: 'a.mp4', type: 'VIDEO' }, { url: 'b.jpg', type: 'IMAGE' }])).toBe(
      'b.jpg',
    );
    expect(pendingPodImage([{ url: 'a.mp4', type: 'VIDEO' }])).toBe('a.mp4');
    expect(pendingPodImage([])).toBeNull();
  });

  it('maps every approval state to a badge and a status line', () => {
    expect(approvalBadge('APPROVED')).toEqual({
      label: 'Approved',
      icon: 'check-circle',
      tone: 'success',
    });
    expect(approvalBadge('DECLINED')).toEqual({ label: 'Declined', icon: 'cancel', tone: 'error' });
    expect(approvalBadge('PENDING')).toEqual({
      label: 'Pending Approval',
      icon: 'schedule',
      tone: 'warning',
    });
    expect(podPendingStatus('PENDING')).toBe('Awaiting venue approval');
    expect(podPendingStatus('DECLINED')).toBe('Venue declined your slot request');
    expect(podPendingStatus('APPROVED')).toBe('Live');
  });

  it('builds a map link from coordinates when geocoded, else name + address', () => {
    expect(venueMapUrl({ ...venue, lat: 12.9, lng: 77.6 })).toContain('query=12.9%2C77.6');
    expect(venueMapUrl(venue)).toContain('query=The%20Loft%2C%2012%20Main%20St');
    expect(venueMapUrl({ ...venue, venue_name: '', address: null })).toBeNull();
  });

  it('builds the contact deep links, stripping non-digits for WhatsApp', () => {
    expect(telUrl('+91 98765 43210')).toBe('tel:+91 98765 43210');
    expect(mailtoUrl('a@b.com')).toBe('mailto:a@b.com');
    expect(whatsappUrl('+91 98765 43210')).toBe('https://wa.me/919876543210');
    expect(whatsappUrl('--')).toBeNull();
  });
});
