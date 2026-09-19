import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LAUNCH_TARGET,
  EMPTY_LAUNCH_MEDIA,
  LAUNCH_HERO_FEATURES,
  LAUNCH_HERO_TRUST,
  LAUNCH_ROLE_SECTIONS,
  LAUNCH_SECTIONS,
  compareCitiesLaunchedFirst,
  launchProgress,
  launchSectionMedia,
  showsWaitlist,
} from '../src/city-launch';

describe('DEFAULT_LAUNCH_TARGET', () => {
  it('is the 2000-person goal a city gets when an admin sets none', () => {
    expect(DEFAULT_LAUNCH_TARGET).toBe(2000);
  });
});

describe('launchProgress', () => {
  it('is the whole percent of the way to the target', () => {
    expect(launchProgress(1252, 2000)).toBe(63);
    expect(launchProgress(0, 2000)).toBe(0);
  });

  it('stops at 100 once the target is reached or passed', () => {
    expect(launchProgress(2000, 2000)).toBe(100);
    expect(launchProgress(2600, 2000)).toBe(100);
  });

  it('never goes below 0', () => {
    expect(launchProgress(-5, 2000)).toBe(0);
  });

  it('is 0 for a zero or negative target', () => {
    expect(launchProgress(40, 0)).toBe(0);
    expect(launchProgress(40, -1)).toBe(0);
  });
});

describe('showsWaitlist', () => {
  it('is true only for a city explicitly not launched', () => {
    expect(showsWaitlist({ is_launched: false })).toBe(true);
  });

  it('treats a launched city, and one from before the flag existed, as live', () => {
    expect(showsWaitlist({ is_launched: true })).toBe(false);
    expect(showsWaitlist({ is_launched: null })).toBe(false);
    expect(showsWaitlist({})).toBe(false);
  });
});

describe('compareCitiesLaunchedFirst', () => {
  it('lists launched cities before the ones waiting on launch, alphabetical within each', () => {
    const cities = [
      { location_name: 'Ahmedabad', is_launched: false },
      { location_name: 'Surat', is_launched: true },
      { location_name: 'Anand', is_launched: false },
      { location_name: 'Rajkot' },
    ];
    expect(cities.toSorted(compareCitiesLaunchedFirst).map((c) => c.location_name)).toEqual([
      'Rajkot',
      'Surat',
      'Ahmedabad',
      'Anand',
    ]);
  });
});

describe('LAUNCH_SECTIONS', () => {
  it('runs top to bottom: the live count, then host, venue and club admin', () => {
    expect(LAUNCH_SECTIONS).toEqual(['hero', 'host', 'venue', 'club_admin']);
  });

  it('is what the role sections cover, in the same order', () => {
    expect(LAUNCH_ROLE_SECTIONS.map((role) => role.section)).toEqual(['host', 'venue', 'club_admin']);
    expect(LAUNCH_ROLE_SECTIONS.map((role) => role.kind)).toEqual(['HOST', 'VENUE', 'CLUB_ADMIN']);
  });
});

describe('launchSectionMedia', () => {
  const media = {
    ...EMPTY_LAUNCH_MEDIA,
    hero_video_url: 'https://ik.imagekit.io/esdata1/launch/delhi-rooftop.mp4',
    hero_image_url: 'https://ik.imagekit.io/esdata1/launch/delhi-rooftop.jpg',
    venue_image_url: 'https://ik.imagekit.io/esdata1/launch/cafe.jpg',
  };

  it('picks one section its video and its backup image', () => {
    expect(launchSectionMedia(media, 'hero')).toEqual({
      videoUrl: 'https://ik.imagekit.io/esdata1/launch/delhi-rooftop.mp4',
      imageUrl: 'https://ik.imagekit.io/esdata1/launch/delhi-rooftop.jpg',
    });
  });

  it('answers empty strings for a section with nothing set, so the ground alone draws', () => {
    expect(launchSectionMedia(media, 'venue')).toEqual({
      videoUrl: '',
      imageUrl: 'https://ik.imagekit.io/esdata1/launch/cafe.jpg',
    });
    expect(launchSectionMedia(EMPTY_LAUNCH_MEDIA, 'club_admin')).toEqual({ videoUrl: '', imageUrl: '' });
  });
});

describe('the page copy lists', () => {
  it('names a pictogram and a full translation key for every item', () => {
    const items = [
      ...LAUNCH_HERO_FEATURES,
      ...LAUNCH_HERO_TRUST,
      ...LAUNCH_ROLE_SECTIONS.flatMap((role) => [...role.chips, ...role.stats]),
    ];
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.iconKey).toMatch(/^[a-z]+$/);
      expect(item.labelKey.startsWith('mweb.cityLaunch.')).toBe(true);
    }
  });
});
