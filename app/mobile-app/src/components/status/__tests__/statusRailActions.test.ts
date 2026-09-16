import { Linking } from 'react-native';
import * as ExpoLinking from 'expo-linking';
import { logs } from '@duncit/logs';

import {
  openStoryTarget,
  openOfficialLink,
  pickViewerStatus,
  pickSlideSeen,
} from '@/components/status/statusRailActions';
import type { StoryTarget } from '@/hooks/useStoryRail';

// statusRailActions only touches `Linking.openURL` from react-native and
// `createURL` from expo-linking at runtime — a minimal replacement keeps this
// spec from depending on the native modules behind either package.
jest.mock('react-native', () => ({
  Linking: { openURL: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('expo-linking', () => ({
  createURL: jest.fn((path: string) => `duncit://app${path}`),
}));
jest.mock('@duncit/logs', () => ({
  logs: { mobileApp: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() } },
}));

const mockedOpenURL = Linking.openURL as jest.Mock;
const mockedCreateURL = ExpoLinking.createURL as jest.Mock;
const mockedLogError = logs.mobileApp.error as jest.Mock;

beforeEach(() => {
  mockedOpenURL.mockClear();
  mockedCreateURL.mockClear();
  mockedLogError.mockClear();
});

describe('openStoryTarget', () => {
  it('opens the club instead of navigating for a club target', () => {
    const navigation = { navigate: jest.fn() } as never;
    const openClub = jest.fn();
    const target: StoryTarget = { kind: 'club', id: 'c1', clubSlug: 'runners', title: 'Runners' };
    openStoryTarget(target, navigation, openClub);
    expect(openClub).toHaveBeenCalledWith('runners');
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(mockedOpenURL).not.toHaveBeenCalled();
  });

  it('opens the sponsored link instead of navigating for a link target', () => {
    const navigation = { navigate: jest.fn() } as never;
    const target: StoryTarget = { kind: 'link', url: 'https://sponsor.example/landing' };
    openStoryTarget(target, navigation, jest.fn());
    expect(mockedOpenURL).toHaveBeenCalledWith('https://sponsor.example/landing');
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('navigates to the public profile for a user target', () => {
    const navigation = { navigate: jest.fn() } as never;
    const target: StoryTarget = { kind: 'user', id: 'u1' };
    openStoryTarget(target, navigation, jest.fn());
    expect(navigation.navigate).toHaveBeenCalledWith('PublicProfile', { userId: 'u1' });
    expect(mockedOpenURL).not.toHaveBeenCalled();
  });
});

describe('openOfficialLink', () => {
  it('resolves an in-app path through the deep link before opening it', () => {
    openOfficialLink('/pods/abc');
    expect(mockedCreateURL).toHaveBeenCalledWith('/pods/abc');
    expect(mockedOpenURL).toHaveBeenCalledWith('duncit://app/pods/abc');
  });

  it('opens an external url as-is, with no deep-link resolution', () => {
    openOfficialLink('https://duncit.com/blog');
    expect(mockedCreateURL).not.toHaveBeenCalled();
    expect(mockedOpenURL).toHaveBeenCalledWith('https://duncit.com/blog');
  });
});

describe('pickViewerStatus', () => {
  const official = { id: 'official' } as never;
  const ad = { id: 'ad' } as never;
  const active = { id: 'active' } as never;

  it('prefers the official status while it is open', () => {
    expect(pickViewerStatus({ official: true, ad: true }, { official, ad, active })).toBe(
      official,
    );
  });

  it('prefers the sponsored ad over the active story once official is closed', () => {
    expect(pickViewerStatus({ official: false, ad: true }, { official, ad, active })).toBe(ad);
  });

  it('falls back to the active story once official and ad are both closed', () => {
    expect(pickViewerStatus({ official: false, ad: false }, { official, ad, active })).toBe(
      active,
    );
  });

  it('falls back to null when nothing is open and nothing is active', () => {
    expect(
      pickViewerStatus({ official: false, ad: false }, { official: null, ad: null }),
    ).toBeNull();
  });
});

describe('pickSlideSeen', () => {
  it('records an official view while the Duncit group is open', () => {
    const record = { official: jest.fn(), story: jest.fn() };
    expect(pickSlideSeen({ official: true, person: false }, record)).toBe(record.official);
  });

  it('returns nothing for a story that records neither kind of view', () => {
    const record = { official: jest.fn(), story: jest.fn() };
    expect(pickSlideSeen({ official: false, person: false }, record)).toBeUndefined();
  });

  it("wraps a followed person's story view in fireAndForget, swallowing a rejection", async () => {
    const story = jest.fn().mockRejectedValue(new Error('network down'));
    const record = { official: jest.fn(), story };
    const seen = pickSlideSeen({ official: false, person: true }, record);
    expect(seen).toBeDefined();
    expect(() => seen?.('slide-1')).not.toThrow();
    expect(story).toHaveBeenCalledWith('slide-1');
    // Let the attached .catch handler settle before asserting it swallowed the error.
    await Promise.resolve();
    await Promise.resolve();
    expect(mockedLogError).toHaveBeenCalledWith('fire-and-forget', 'fireAndForget', {
      error: expect.any(Error),
    });
  });

  it("resolves a followed person's story view without logging on success", async () => {
    const story = jest.fn().mockResolvedValue(undefined);
    const record = { official: jest.fn(), story };
    const seen = pickSlideSeen({ official: false, person: true }, record);
    seen?.('slide-2');
    await Promise.resolve();
    await Promise.resolve();
    expect(story).toHaveBeenCalledWith('slide-2');
    expect(mockedLogError).not.toHaveBeenCalled();
  });
});
