import { describe, expect, it } from 'vitest';
import {
  buildCreatePodInput,
  createPodSchema,
  hydrateDraft,
  serializeDraft,
  STEP_FIELDS,
  STEP_TITLES,
} from './create-pod.form';
import { blankCreatePodForm, type CreatePodFormValues } from './create-pod.types';

const future = (hours = 24) => new Date(Date.now() + hours * 3_600_000);

const valid = (over: Partial<CreatePodFormValues> = {}): CreatePodFormValues => ({
  ...blankCreatePodForm,
  pod_title: 'Sunday community hike',
  club_id: 'club-1',
  venue_id: 'venue-1',
  pod_description: 'A relaxed group hike around the lake.',
  pod_date_time: future(),
  ...over,
});

const issuesOf = (values: CreatePodFormValues) => {
  const result = createPodSchema.safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

describe('createPodSchema', () => {
  it('accepts a valid physical pod', () => {
    expect(createPodSchema.safeParse(valid()).success).toBe(true);
  });

  it('requires title, club and description', () => {
    const paths = issuesOf(valid({ pod_title: 'x', club_id: '', pod_description: 'short' }));
    expect(paths).toContain('pod_title');
    expect(paths).toContain('club_id');
    expect(paths).toContain('pod_description');
  });

  it('requires a venue for physical pods', () => {
    expect(issuesOf(valid({ venue_id: '' }))).toContain('venue_id');
  });

  it('requires a valid meeting link for virtual pods (and no venue)', () => {
    expect(issuesOf(valid({ pod_mode: 'VIRTUAL', venue_id: '', meeting_url: '' }))).toContain('meeting_url');
    expect(issuesOf(valid({ pod_mode: 'VIRTUAL', venue_id: '', meeting_url: 'not-a-url' }))).toContain('meeting_url');
    expect(
      createPodSchema.safeParse(
        valid({ pod_mode: 'VIRTUAL', venue_id: '', meeting_url: 'https://meet.duncit.com/x' }),
      ).success,
    ).toBe(true);
  });

  it('rejects past start dates and ends before the start', () => {
    expect(issuesOf(valid({ pod_date_time: new Date(Date.now() - 60_000) }))).toContain('pod_date_time');
    expect(issuesOf(valid({ pod_end_date_time: new Date(Date.now() + 1_800_000), pod_date_time: future() }))).toContain(
      'pod_end_date_time',
    );
  });

  it('forces free pods to amount 0 and caps paid amounts', () => {
    expect(issuesOf(valid({ pod_type: 'NATIVE_FREE', pod_amount: 100 }))).toContain('pod_amount');
    expect(issuesOf(valid({ pod_type: 'NATIVE_PAID', pod_amount: 2500 }))).toContain('pod_amount');
    expect(createPodSchema.safeParse(valid({ pod_type: 'NATIVE_PAID', pod_amount: 499 })).success).toBe(true);
  });

  it('requires at least one product when products are enabled', () => {
    expect(issuesOf(valid({ products_enabled: true, product_requests: [] }))).toContain('product_requests');
    expect(
      createPodSchema.safeParse(
        valid({ products_enabled: true, product_requests: [{ product_id: 'p1', quantity: 2 }] }),
      ).success,
    ).toBe(true);
  });

  it('exposes one field group and title per step', () => {
    expect(STEP_FIELDS).toHaveLength(STEP_TITLES.length);
    expect(STEP_TITLES).toHaveLength(7);
  });
});

describe('buildCreatePodInput', () => {
  it('maps a physical pod with hashtags, media, chips, products and charges', () => {
    const input = buildCreatePodInput(
      valid({
        pod_hashtag_text: '#weekend, #community fun',
        media_text: 'https://cdn/img.jpg\nhttps://cdn/clip.mp4\n',
        what_this_pod_offers: ['Snacks', 'Guided trail'],
        available_perks: ['Stickers'],
        products_enabled: true,
        product_requests: [{ product_id: 'p1', quantity: 3 }],
        place_charges: [{ label: 'Entry', amount: 50, note: '' }],
      }),
    );
    expect(input.pod_hashtag).toEqual(['weekend', 'community', 'fun']);
    expect(input.pod_images_and_videos).toEqual([
      { url: 'https://cdn/img.jpg', type: 'IMAGE' },
      { url: 'https://cdn/clip.mp4', type: 'VIDEO' },
    ]);
    expect(input.what_this_pod_offers).toEqual(['Snacks', 'Guided trail']);
    expect(input.available_perks).toEqual(['Stickers']);
    expect(input.product_requests).toEqual([{ product_id: 'p1', quantity: 3 }]);
    expect(input.place_charges).toEqual([{ label: 'Entry', amount: 50, note: '' }]);
    expect(input.venue_id).toBe('venue-1');
    expect(input.meeting_url).toBeNull();
    expect(input.is_active).toBe(true);
  });

  it('drops product requests when products are disabled', () => {
    const input = buildCreatePodInput(
      valid({ products_enabled: false, product_requests: [{ product_id: 'p1', quantity: 3 }] }),
    );
    expect(input.product_requests).toEqual([]);
  });

  it('maps a virtual pod with meeting fields and no venue', () => {
    const input = buildCreatePodInput(
      valid({
        pod_mode: 'VIRTUAL',
        venue_id: 'ignored',
        meeting_platform: 'Meet',
        meeting_url: 'https://meet.duncit.com/x',
        meeting_notes: 'Join early',
      }),
    );
    expect(input.venue_id).toBeNull();
    expect(input.meeting_platform).toBe('Meet');
    expect(input.meeting_url).toBe('https://meet.duncit.com/x');
    expect(input.meeting_notes).toBe('Join early');
  });
});

describe('draft serialize/hydrate', () => {
  it('round-trips values and revives Date fields', () => {
    const start = future();
    const end = future(26);
    const values = valid({ pod_date_time: start, pod_end_date_time: end, what_this_pod_offers: ['A'] });
    const draft = serializeDraft(values, 2);
    expect(draft.pod_title).toBe('Sunday community hike');
    expect(draft.step).toBe(2);

    const restored = hydrateDraft(draft.payload);
    expect(restored.pod_date_time?.getTime()).toBe(start.getTime());
    expect(restored.pod_end_date_time?.getTime()).toBe(end.getTime());
    expect(restored.what_this_pod_offers).toEqual(['A']);
  });

  it('falls back to a blank form for invalid payloads', () => {
    expect(hydrateDraft('not-json')).toEqual(blankCreatePodForm);
  });
});
