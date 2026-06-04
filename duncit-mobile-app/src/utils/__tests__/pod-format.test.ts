import type { HomePod } from '@/hooks/useHomeFeed';
import { podDateLabel, podImageUrl, podPlaceLabel, podPriceLabel } from '@/utils/pod-format';

const base = {
  id: '1',
  pod_id: 'p1',
  pod_title: 'T',
  club_id: 'c1',
  club_slug: 's',
  no_of_spots: 0,
  pod_amount: 0,
  pod_date_time: '',
  pod_type: 'NATIVE_FREE',
  pod_images_and_videos: [],
  host_names: [],
  place_label: null,
  place_detail: null,
} as unknown as HomePod;

const withPod = (patch: Record<string, unknown>) => ({ ...base, ...patch }) as unknown as HomePod;

describe('pod-format', () => {
  it('prefers an IMAGE media url, falls back to the first, else null', () => {
    expect(
      podImageUrl(
        withPod({
          pod_images_and_videos: [
            { url: 'v', type: 'VIDEO' },
            { url: 'i', type: 'IMAGE' },
          ],
        }),
      ),
    ).toBe('i');
    expect(podImageUrl(withPod({ pod_images_and_videos: [{ url: 'v', type: 'VIDEO' }] }))).toBe(
      'v',
    );
    expect(podImageUrl(base)).toBeNull();
  });

  it('labels free pods as Free and paid pods in rupees', () => {
    expect(podPriceLabel(withPod({ pod_type: 'NATIVE_FREE' }))).toBe('Free');
    expect(podPriceLabel(withPod({ pod_type: 'NATIVE_PAID', pod_amount: 250 }))).toBe('₹250');
  });

  it('joins place label and detail, or returns empty', () => {
    expect(podPlaceLabel(withPod({ place_label: 'Cafe', place_detail: 'MG Road' }))).toBe(
      'Cafe · MG Road',
    );
    expect(podPlaceLabel(base)).toBe('');
  });

  it('formats a valid date and guards missing/invalid ones', () => {
    expect(podDateLabel(withPod({ pod_date_time: '2026-06-07T18:30:00.000Z' }))).toContain('·');
    expect(podDateLabel(base)).toBe('Date pending');
    expect(podDateLabel(withPod({ pod_date_time: 'not-a-date' }))).toBe('Date pending');
  });
});
