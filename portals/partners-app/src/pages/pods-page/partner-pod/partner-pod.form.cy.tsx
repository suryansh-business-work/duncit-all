import { describe, expect, it } from 'vitest';
import { partnerPodSchema } from './partner-pod.form';

const validPod = {
  pod_title: 'Community breakfast meetup',
  club_id: 'club-1',
  venue_id: 'venue-1',
  venue_slot_id: 'slot-1',
  pod_mode: 'PHYSICAL',
  meeting_platform: '',
  meeting_url: '',
  meeting_notes: '',
  pod_hashtag_text: 'breakfast community',
  media_text: '',
  pod_description: 'A friendly breakfast meetup for local members.',
  pod_date_time: new Date(Date.now() + 86400000),
  pod_end_date_time: new Date(Date.now() + 90000000),
  pod_type: 'NATIVE_PAID',
  pod_amount: 299,
  pod_occurrence: 'ONE_TIME',
  no_of_spots: 20,
  pod_info: '',
  what_this_pod_offers_text: 'Networking',
  available_perks_text: 'Tea',
  payment_terms: '',
  products_enabled: false,
  product_requests: [],
};

const messages = (result: ReturnType<typeof partnerPodSchema.safeParse>) =>
  result.success ? '' : result.error.issues.map((issue) => issue.message).join(' ');

describe('partnerPodSchema', () => {
  it('requires core pod details', () => {
    const result = partnerPodSchema.safeParse({ ...validPod, pod_title: '', club_id: '' });
    expect(messages(result)).toMatch(/title/i);
    expect(messages(result)).toMatch(/club/i);
  });

  it('requires meeting link for virtual pods', () => {
    const result = partnerPodSchema.safeParse({ ...validPod, pod_mode: 'VIRTUAL', venue_id: '', meeting_url: '' });
    expect(messages(result)).toMatch(/meeting link/i);
  });

  it('accepts a complete pod', () => {
    expect(partnerPodSchema.safeParse(validPod).success).toBe(true);
  });
});
