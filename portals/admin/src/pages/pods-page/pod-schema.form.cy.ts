import { describe, expect, it } from 'vitest';
import { makePodSchema, type PodFormConfig } from '@duncit/pod-form';

const adminConfig: PodFormConfig = {
  showHosts: true,
  requireHosts: true,
  showLocationZone: true,
  showVenueSlot: true,
  showPlaceCharges: true,
  showInventory: true,
  showFinance: true,
  showIsActive: true,
  showProducts: true,
  showReel: true,
};

const podFormSchema = makePodSchema(adminConfig);

const base = {
  pod_title: 'Sunday Hike',
  club_id: 'club-1',
  pod_mode: 'PHYSICAL' as const,
  venue_id: 'venue-1',
  venue_slot_id: '',
  location_id: '',
  zone_name: '',
  meeting_platform: '',
  meeting_url: '',
  meeting_notes: '',
  pod_hosts_id: ['host-1'],
  pod_description: 'Easy hike around the city',
  pod_date_time: new Date(Date.now() + 1000 * 60 * 60 * 24),
  pod_end_date_time: null,
  pod_type: 'FREE',
  pod_amount: 0,
  pod_occurrence: 'ONCE',
  no_of_spots: 10,
  pod_info: '',
  pod_hashtag_text: '',
  media_text: 'https://cdn.example.com/pod.jpg',
  payment_terms: '',
  what_this_pod_offers: [],
  available_perks: [],
  place_charges: [],
  products_enabled: false,
  product_requests: [],
  is_active: true,
};

const messagesFor = (input: Record<string, unknown>) => {
  const result = podFormSchema.safeParse(input);
  return result.success ? '' : result.error.issues.map((issue) => issue.message).join(' ');
};

describe('makePodSchema (admin config)', () => {
  it('rejects empty title', () => {
    expect(messagesFor({ ...base, pod_title: '' })).toMatch(/title/i);
  });

  it('rejects past pod_date_time', () => {
    expect(messagesFor({ ...base, pod_date_time: new Date('2000-01-01T10:00:00Z') })).toMatch(/start/i);
  });

  it('rejects VIRTUAL pod without meeting_url', () => {
    expect(messagesFor({ ...base, pod_mode: 'VIRTUAL', venue_id: '', meeting_url: '' })).toMatch(
      /meeting link|meeting url|select a venue/i,
    );
  });

  it('requires at least one image in the media list', () => {
    expect(messagesFor({ ...base, media_text: '' })).toMatch(/at least one image/i);
    expect(messagesFor({ ...base, media_text: 'https://cdn.example.com/clip.mp4' })).toMatch(
      /at least one image/i,
    );
    const mixed = ['https://cdn.example.com/clip.mp4', 'https://cdn.example.com/a.jpg'].join('\n');
    expect(podFormSchema.safeParse({ ...base, media_text: mixed }).success).toBe(true);
  });

  it('rejects FREE pod with non-zero amount', () => {
    expect(messagesFor({ ...base, pod_type: 'FREE', pod_amount: 100 })).toMatch(/free pods/i);
  });

  it('rejects empty pod_hosts_id when hosts are shown', () => {
    expect(messagesFor({ ...base, pod_hosts_id: [] })).toMatch(/host/i);
  });

  it('requires a slot only while the dates are missing (slot picker on)', () => {
    expect(messagesFor({ ...base, pod_date_time: null })).toMatch(/slot/i);
    expect(podFormSchema.safeParse(base).success).toBe(true);
  });

  it('rejects a malformed reel url and accepts empty or valid ones', () => {
    expect(messagesFor({ ...base, reel_url: 'not-a-url' })).toMatch(/reel/i);
    expect(podFormSchema.safeParse({ ...base, reel_url: '' }).success).toBe(true);
    expect(
      podFormSchema.safeParse({ ...base, reel_url: 'https://cdn.example.com/reel.mp4' }).success,
    ).toBe(true);
  });

  it('accepts a fully valid pod', () => {
    expect(podFormSchema.safeParse(base).success).toBe(true);
  });
});
