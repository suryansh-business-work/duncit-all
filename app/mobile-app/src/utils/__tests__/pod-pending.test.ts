import {
  approvalBadge,
  mailtoUrl,
  pendingPodImage,
  podPendingStatus,
  telUrl,
  venueMapUrl,
  whatsappUrl,
} from '@/utils/pod-pending';

describe('pendingPodImage', () => {
  it('prefers the first IMAGE over earlier videos', () => {
    const media = [
      { url: 'v.mp4', type: 'VIDEO' },
      { url: 'a.jpg', type: 'IMAGE' },
    ];
    expect(pendingPodImage(media)).toBe('a.jpg');
  });

  it('falls back to the first media item when no image exists', () => {
    expect(pendingPodImage([{ url: 'v.mp4', type: 'VIDEO' }])).toBe('v.mp4');
  });

  it('returns null for an empty gallery', () => {
    expect(pendingPodImage([])).toBeNull();
  });
});

describe('approvalBadge', () => {
  it('maps every venue decision to a badge', () => {
    expect(approvalBadge('PENDING')).toEqual({
      label: 'Pending Approval',
      icon: 'schedule',
      tone: 'warning',
    });
    expect(approvalBadge('APPROVED')).toEqual({
      label: 'Approved',
      icon: 'check-circle',
      tone: 'success',
    });
    expect(approvalBadge('DECLINED')).toEqual({ label: 'Declined', icon: 'cancel', tone: 'error' });
    expect(approvalBadge(null).tone).toBe('warning');
  });
});

describe('podPendingStatus', () => {
  it('derives the pod status line from the venue decision', () => {
    expect(podPendingStatus('PENDING')).toBe('Awaiting venue approval');
    expect(podPendingStatus('DECLINED')).toBe('Venue declined your slot request');
    expect(podPendingStatus('APPROVED')).toBe('Live');
    expect(podPendingStatus(null)).toBe('Live');
  });
});

describe('venueMapUrl', () => {
  it('prefers lat,lng when the venue is geocoded', () => {
    const url = venueMapUrl({ venue_name: 'Loft', address: 'MG Road', lat: 12.9, lng: 77.6 });
    expect(url).toBe('https://www.google.com/maps/search/?api=1&query=12.9%2C77.6');
  });

  it('falls back to name + address text', () => {
    const url = venueMapUrl({ venue_name: 'Loft', address: 'MG Road', lat: null, lng: null });
    expect(url).toBe('https://www.google.com/maps/search/?api=1&query=Loft%2C%20MG%20Road');
  });

  it('skips a blank address part and returns null with nothing usable', () => {
    expect(venueMapUrl({ venue_name: 'Loft', address: null, lat: null, lng: 77.6 })).toContain(
      'query=Loft',
    );
    expect(venueMapUrl({ venue_name: '', address: null, lat: 12.9, lng: null })).toBeNull();
  });
});

describe('contact links', () => {
  it('builds tel:/mailto: links', () => {
    expect(telUrl('+91 987')).toBe('tel:+91 987');
    expect(mailtoUrl('a@b.c')).toBe('mailto:a@b.c');
  });

  it('strips a formatted number down to digits for wa.me', () => {
    expect(whatsappUrl('+91 98765-43210')).toBe('https://wa.me/919876543210');
    expect(whatsappUrl('n/a')).toBeNull();
  });
});
