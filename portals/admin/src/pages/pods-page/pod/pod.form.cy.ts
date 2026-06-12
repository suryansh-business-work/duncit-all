import { describe, expect, it } from 'vitest';
import { podFormSchema } from './pod.form';

const futureISO = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString().slice(0, 16);
const pastISO = '2000-01-01T10:00';

const base = {
  pod_title: 'Sunday Hike',
  club_id: 'club-1',
  pod_mode: 'PHYSICAL' as const,
  venue_id: 'venue-1',
  location_id: '',
  zone_name: '',
  meeting_platform: '',
  meeting_url: '',
  meeting_notes: '',
  pod_hosts_id: ['host-1'],
  pod_description: 'Easy hike around the city',
  pod_date_time: futureISO,
  pod_end_date_time: '',
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
};

describe('podFormSchema', () => {
  it('rejects empty title', async () => {
    const error = await podFormSchema.validate({ ...base, pod_title: '' }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/title/i);
  });

  it('rejects past pod_date_time', async () => {
    const error = await podFormSchema.validate({ ...base, pod_date_time: pastISO }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/start/i);
  });

  it('rejects VIRTUAL pod without meeting_url', async () => {
    const error = await podFormSchema
      .validate({ ...base, pod_mode: 'VIRTUAL', venue_id: '', meeting_url: '' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.name).toBe('ValidationError');
    expect(error.errors.join(' ')).toMatch(/meeting link|meeting url|select a venue/i);
  });

  it('requires at least one image in the media list', async () => {
    const empty = await podFormSchema.validate({ ...base, media_text: '' }, { abortEarly: false }).catch((e) => e);
    expect(empty.errors.join(' ')).toMatch(/at least one image/i);
    const videoOnly = await podFormSchema
      .validate({ ...base, media_text: 'https://cdn.example.com/clip.mp4' }, { abortEarly: false })
      .catch((e) => e);
    expect(videoOnly.errors.join(' ')).toMatch(/at least one image/i);
    const mixed = ['https://cdn.example.com/clip.mp4', 'https://cdn.example.com/a.jpg'].join('\n');
    await expect(podFormSchema.validate({ ...base, media_text: mixed })).resolves.toBeTruthy();
  });

  it('rejects FREE pod with non-zero amount', async () => {
    const error = await podFormSchema
      .validate({ ...base, pod_type: 'FREE', pod_amount: 100 }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/free pods/i);
  });

  it('rejects empty pod_hosts_id', async () => {
    const error = await podFormSchema.validate({ ...base, pod_hosts_id: [] }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/host/i);
  });

  it('accepts a fully valid pod', async () => {
    await expect(podFormSchema.validate(base)).resolves.toBeTruthy();
  });
});
