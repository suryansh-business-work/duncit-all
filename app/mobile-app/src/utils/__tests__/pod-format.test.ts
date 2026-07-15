import type { HomePod } from '@/hooks/useHomeFeed';
import {
  formatMeetingPlatform,
  isPodActive,
  isPodExpired,
  podDateLabel,
  podImageUrl,
  podModeLabel,
  podOccurrenceLabel,
  podPlaceLabel,
  podPriceLabel,
  podScheduleLabel,
  podShareMessage,
  podTimeChip,
} from '@/utils/pod-format';

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

  it('labels the pod mode', () => {
    expect(podModeLabel('VIRTUAL')).toBe('Virtual');
    expect(podModeLabel('PHYSICAL')).toBe('Physical');
    expect(podModeLabel(null)).toBe('Physical');
  });

  it('labels the occurrence from the enum', () => {
    expect(podOccurrenceLabel('ONE_TIME')).toBe('One time');
    expect(podOccurrenceLabel('WEEKENDS_ONLY')).toBe('Weekends only');
    expect(podOccurrenceLabel('CUSTOM_THING')).toBe('CUSTOM THING');
    expect(podOccurrenceLabel(null)).toBe('');
  });

  it('builds the countdown chip across all tones', () => {
    expect(podTimeChip(null)).toBeNull();
    expect(podTimeChip('not-a-date')).toBeNull();
    expect(podTimeChip('2000-01-01T00:00:00.000Z')).toEqual({
      label: 'Pod expired',
      tone: 'error',
    });
    const inDays = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    expect(podTimeChip(inDays)).toEqual({ label: '5 days remaining', tone: 'info' });
    const inHours = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString();
    expect(podTimeChip(inHours)).toEqual({ label: '5 hours remaining', tone: 'warning' });
    const soon = new Date(Date.now() + 30 * 1000).toISOString();
    expect(podTimeChip(soon)).toEqual({ label: 'Starting soon', tone: 'warning' });
  });

  it('maps meeting-platform enums to human labels with a title-cased fallback', () => {
    expect(formatMeetingPlatform('GOOGLE_MEET')).toBe('Google Meet');
    expect(formatMeetingPlatform('ZOOM')).toBe('Zoom');
    expect(formatMeetingPlatform('TEAMS')).toBe('Microsoft Teams');
    expect(formatMeetingPlatform('JITSI_MEET')).toBe('Jitsi Meet');
    // Empty segments (double underscore) keep their blank slot in the fallback.
    expect(formatMeetingPlatform('TEAM__X')).toBe('Team  X');
    expect(formatMeetingPlatform(null)).toBe('Online');
    expect(formatMeetingPlatform('')).toBe('Online');
  });

  it('treats upcoming/live pods as active and past pods as inactive', () => {
    expect(isPodActive(null)).toBe(true);
    expect(isPodActive('not-a-date')).toBe(true);
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    expect(isPodActive(future)).toBe(true);
    const longPast = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(isPodActive(longPast)).toBe(false);
    const recentStart = new Date(Date.now() - 60 * 1000).toISOString();
    const futureEnd = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    expect(isPodActive(recentStart, futureEnd)).toBe(true);
    const pastEnd = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    expect(isPodActive(recentStart, pastEnd)).toBe(false);
  });

  it('marks a pod expired only once its start time has passed', () => {
    expect(isPodExpired(null)).toBe(false);
    expect(isPodExpired('not-a-date')).toBe(false);
    expect(isPodExpired(new Date(Date.now() + 60 * 60 * 1000).toISOString())).toBe(false);
    expect(isPodExpired(new Date(Date.now() - 60 * 60 * 1000).toISOString())).toBe(true);
  });

  it('formats the long schedule label with and without an end', () => {
    expect(podScheduleLabel(null)).toBe('Date pending');
    expect(podScheduleLabel('not-a-date')).toBe('Date pending');
    const start = podScheduleLabel('2026-06-02T13:30:00.000Z', '2026-06-02T15:30:00.000Z');
    expect(start).toContain('2026');
    expect(start).toContain('→');
    expect(podScheduleLabel('2026-06-02T13:30:00.000Z', 'not-a-date')).not.toContain('→');
  });
});

describe('podShareMessage', () => {
  const sharable = {
    pod_id: 'p1',
    pod_title: 'Sunset Jam',
    club_slug: 'jazz-club',
    pod_date_time: '2026-06-02T13:30:00.000Z',
    pod_end_date_time: null,
    place_label: 'Indiranagar',
    place_detail: 'Bengaluru',
  };

  it('includes the title, schedule, venue and a deep link', () => {
    const { message, url } = podShareMessage(sharable);
    expect(url).toBe('https://mweb.duncit.com/club/jazz-club/pod/p1');
    expect(message).toContain('Sunset Jam');
    expect(message).toContain('When:');
    expect(message).toContain('Where: Indiranagar · Bengaluru');
    expect(message).toContain(url);
  });

  it('falls back to a club-less url and omits absent date/venue', () => {
    const { message, url } = podShareMessage({ pod_id: 'p2', pod_title: 'Open Mic' });
    expect(url).toBe('https://mweb.duncit.com/pod/p2');
    expect(message).not.toContain('When:');
    expect(message).not.toContain('Where:');
    expect(message).toContain('Open Mic');
  });
});
