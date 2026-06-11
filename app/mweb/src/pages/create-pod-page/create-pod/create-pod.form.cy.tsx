import { describe, expect, it } from 'vitest';
import { buildCreatePodInput, createPodSchema } from './create-pod.form';
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
});

describe('buildCreatePodInput', () => {
  it('maps a physical pod with hashtags, media and line lists', () => {
    const input = buildCreatePodInput(
      valid({
        pod_hashtag_text: '#weekend, #community fun',
        media_text: 'https://cdn/img.jpg\nhttps://cdn/clip.mp4\n',
        what_this_pod_offers_text: 'Snacks\n\nGuided trail',
        available_perks_text: 'Stickers',
      }),
    );
    expect(input.pod_hashtag).toEqual(['weekend', 'community', 'fun']);
    expect(input.pod_images_and_videos).toEqual([
      { url: 'https://cdn/img.jpg', type: 'IMAGE' },
      { url: 'https://cdn/clip.mp4', type: 'VIDEO' },
    ]);
    expect(input.what_this_pod_offers).toEqual(['Snacks', 'Guided trail']);
    expect(input.available_perks).toEqual(['Stickers']);
    expect(input.venue_id).toBe('venue-1');
    expect(input.meeting_url).toBeNull();
    expect(input.is_active).toBe(true);
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
