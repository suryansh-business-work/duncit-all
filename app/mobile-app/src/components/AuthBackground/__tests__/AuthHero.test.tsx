import { AccessibilityInfo } from 'react-native';
import { act, screen, within } from '@testing-library/react-native';
import { useVideoPlayer } from 'expo-video';
import { Text } from 'tamagui';

import { AuthBackground, AuthHero } from '@/components/AuthBackground';
import { useBranding } from '@/hooks/useBranding';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useBranding');
const mockLogError = jest.fn();
jest.mock('@duncit/logs', () => ({
  logs: { mobileApp: { error: (...args: unknown[]) => mockLogError(...args) } },
}));

const mockedUseBranding = jest.mocked(useBranding);
const mockedUseVideoPlayer = useVideoPlayer as jest.Mock;

interface MockPlayer {
  play: jest.Mock;
  pause: jest.Mock;
  addListener: jest.Mock;
}

const withHero = (hero: { image?: string; video?: string }) =>
  mockedUseBranding.mockReturnValue({
    data: {
      branding: {
        login_background_image_enabled: Boolean(hero.image),
        login_background_image_url: hero.image ?? '',
        login_background_video_enabled: Boolean(hero.video),
        login_background_video_url: hero.video ?? '',
      },
    },
    isLoading: false,
  } as never);

const flush = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

let motionHandler: (enabled: boolean) => void = () => undefined;
const removeMotion = jest.fn();
const listenForMotion = (_event: string, handler: (enabled: boolean) => void) => {
  motionHandler = handler;
  return { remove: removeMotion };
};

function renderHero() {
  return renderWithProviders(
    <AuthHero room={120}>
      <Text testID="hero-child">Welcome</Text>
    </AuthHero>,
  );
}

const lastPlayer = (): MockPlayer => mockedUseVideoPlayer.mock.results.at(-1)?.value as MockPlayer;

/** The player's `statusChange` listener, as the effect registered it. */
const statusListener = (player: MockPlayer) => {
  const call = player.addListener.mock.calls.find(([event]) => event === 'statusChange');
  return call?.[1] as (event: { status: string }) => void;
};

beforeEach(() => {
  jest.clearAllMocks();
  motionHandler = () => undefined;
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation(listenForMotion as never);
});

describe('AuthBackground', () => {
  it('draws its children on the flat ground', () => {
    renderWithProviders(
      <AuthBackground>
        <Text testID="ground-child">form</Text>
      </AuthBackground>,
    );
    expect(
      within(screen.getByTestId('auth-background')).getByTestId('ground-child'),
    ).toBeOnTheScreen();
  });
});

describe('AuthHero — media', () => {
  it('renders only its children when no hero is switched on', () => {
    withHero({});
    renderHero();
    expect(screen.getByTestId('hero-child')).toBeOnTheScreen();
    expect(screen.queryByTestId('auth-hero')).toBeNull();
    expect(screen.queryByTestId('auth-backdrop-image')).toBeNull();
    expect(screen.queryByTestId('auth-backdrop-video')).toBeNull();
  });

  it('draws the image hero with the heading on it', () => {
    withHero({ image: 'https://cdn/pic.jpg' });
    renderHero();
    const hero = screen.getByTestId('auth-hero');
    expect(within(hero).getByTestId('auth-backdrop-image').props.source).toEqual({
      uri: 'https://cdn/pic.jpg',
    });
    expect(within(hero).getByTestId('hero-child')).toBeOnTheScreen();
    expect(screen.queryByTestId('auth-backdrop-video')).toBeNull();
  });

  it('prefers the video over the image, muted and looping', () => {
    withHero({ image: 'https://cdn/pic.jpg', video: 'https://cdn/clip.mp4' });
    renderHero();
    expect(screen.getByTestId('auth-backdrop-video')).toBeOnTheScreen();
    expect(screen.queryByTestId('auth-backdrop-image')).toBeNull();
    expect(mockedUseVideoPlayer).toHaveBeenCalledWith('https://cdn/clip.mp4', expect.any(Function));
    const player = lastPlayer() as MockPlayer & { loop: boolean; muted: boolean };
    expect(player.loop).toBe(true);
    expect(player.muted).toBe(true);
  });
});

describe('AuthHero — video motion (WCAG 2.2.2)', () => {
  beforeEach(() => {
    withHero({ video: 'https://cdn/clip.mp4' });
  });

  it('plays, and re-asserts play once the source is ready', async () => {
    renderHero();
    await flush();
    const player = lastPlayer();
    expect(player.pause).not.toHaveBeenCalled();

    player.play.mockClear();
    statusListener(player)({ status: 'readyToPlay' });
    expect(player.play).toHaveBeenCalledTimes(1);

    player.play.mockClear();
    statusListener(player)({ status: 'loading' });
    expect(player.play).not.toHaveBeenCalled();
  });

  it('holds still on its frame when Reduce Motion is on, even once ready', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    renderHero();
    await flush();
    const player = lastPlayer();
    expect(player.pause).toHaveBeenCalledTimes(1);

    player.play.mockClear();
    statusListener(player)({ status: 'readyToPlay' });
    expect(player.play).not.toHaveBeenCalled();
  });

  it('follows the setting when it is switched while the screen is open', async () => {
    renderHero();
    await flush();
    const player = lastPlayer();

    motionHandler(true);
    expect(player.pause).toHaveBeenCalledTimes(1);

    player.play.mockClear();
    motionHandler(false);
    expect(player.play).toHaveBeenCalledTimes(1);
  });

  it('logs when the Reduce Motion setting cannot be read, and keeps playing', async () => {
    const error = new Error('unavailable');
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockRejectedValue(error);
    renderHero();
    await flush();

    expect(mockLogError).toHaveBeenCalledWith('AuthHero', 'isReduceMotionEnabled', { error });
    expect(lastPlayer().pause).not.toHaveBeenCalled();
  });

  it('lets go of both listeners and ignores a late setting after unmount', async () => {
    let answer: (enabled: boolean) => void = () => undefined;
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockReturnValue(
      new Promise<boolean>((resolve) => {
        answer = resolve;
      }),
    );
    const view = renderHero();
    const player = lastPlayer();
    const statusSub = player.addListener.mock.results[0]?.value as { remove: jest.Mock };
    view.unmount();

    expect(removeMotion).toHaveBeenCalledTimes(1);
    expect(statusSub.remove).toHaveBeenCalledTimes(1);

    answer(true);
    await flush();
    expect(player.pause).not.toHaveBeenCalled();
  });
});
