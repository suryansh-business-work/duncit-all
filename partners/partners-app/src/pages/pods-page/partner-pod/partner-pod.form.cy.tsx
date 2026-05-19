import { describe, expect, it } from 'vitest';
import { partnerPodSchema } from './partner-pod.form';

const validPod = {
  pod_title: 'Community breakfast meetup',
  club_id: 'club-1',
  venue_id: 'venue-1',
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

describe('partnerPodSchema', () => {
  it('requires core pod details', async () => {
    const error = await partnerPodSchema.validate({ ...validPod, pod_title: '', club_id: '' }, { abortEarly: false }).catch((caught) => caught);
    expect(error.errors.join(' ')).toMatch(/title/i);
    expect(error.errors.join(' ')).toMatch(/club/i);
  });

  it('requires meeting link for virtual pods', async () => {
    const error = await partnerPodSchema.validate({ ...validPod, pod_mode: 'VIRTUAL', venue_id: '', meeting_url: '' }, { abortEarly: false }).catch((caught) => caught);
    expect(error.errors.join(' ')).toMatch(/meeting link/i);
  });

  it('accepts a complete pod', async () => {
    await partnerPodSchema.validate(validPod, { abortEarly: false });
  });
});