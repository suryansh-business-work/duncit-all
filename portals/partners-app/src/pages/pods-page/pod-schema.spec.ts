import { describe, expect, it } from 'vitest';
import { makePodSchema } from '@duncit/pod-form';
import { PARTNER_POD_CONFIG } from './partner-pod-config';

const partnerPodSchema = makePodSchema(PARTNER_POD_CONFIG);

const validPod = {
  pod_title: 'Community breakfast meetup',
  club_id: 'club-1',
  venue_id: 'venue-1',
  venue_slot_id: 'slot-1',
  pod_mode: 'PHYSICAL' as const,
  meeting_platform: '',
  meeting_url: '',
  meeting_notes: '',
  pod_hosts_id: [],
  pod_hashtag_text: 'breakfast community',
  media_text: 'https://cdn.example.com/pod.jpg',
  pod_description: 'A friendly breakfast meetup for local members.',
  pod_date_time: new Date(Date.now() + 86400000),
  pod_end_date_time: new Date(Date.now() + 90000000),
  pod_type: 'NATIVE_PAID',
  pod_amount: 299,
  pod_occurrence: 'ONE_TIME',
  no_of_spots: 20,
  pod_info: '',
  what_this_pod_offers: ['Networking'],
  available_perks: ['Tea'],
  payment_terms: '',
  place_charges: [],
  products_enabled: false,
  product_requests: [],
  is_active: true,
};

const messages = (result: ReturnType<typeof partnerPodSchema.safeParse>) =>
  result.success ? '' : result.error.issues.map((issue) => issue.message).join(' ');

describe('makePodSchema (partner config)', () => {
  it('requires core pod details', () => {
    const result = partnerPodSchema.safeParse({ ...validPod, pod_title: '', club_id: '' });
    expect(messages(result)).toMatch(/title/i);
    expect(messages(result)).toMatch(/club/i);
  });

  it('requires meeting link for virtual pods', () => {
    const result = partnerPodSchema.safeParse({ ...validPod, pod_mode: 'VIRTUAL', venue_id: '', venue_slot_id: '', meeting_url: '' });
    expect(messages(result)).toMatch(/meeting link/i);
  });

  it('requires an available slot when a venue is picked', () => {
    const result = partnerPodSchema.safeParse({ ...validPod, venue_slot_id: '' });
    expect(messages(result)).toMatch(/slot/i);
  });

  it('does not require a host (host is injected server-side)', () => {
    expect(partnerPodSchema.safeParse({ ...validPod, pod_hosts_id: [] }).success).toBe(true);
  });

  it('accepts a complete pod', () => {
    expect(partnerPodSchema.safeParse(validPod).success).toBe(true);
  });
});
