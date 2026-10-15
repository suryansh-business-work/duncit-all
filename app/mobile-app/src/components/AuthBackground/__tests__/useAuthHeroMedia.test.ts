import { renderHook } from '@testing-library/react-native';

import { useBranding } from '@/hooks/useBranding';

import { useAuthHeroMedia } from '../useAuthHeroMedia';

jest.mock('@/hooks/useBranding');
const mockedUseBranding = jest.mocked(useBranding);

const withBranding = (branding: Record<string, unknown> | undefined) =>
  mockedUseBranding.mockReturnValue({
    data: branding === undefined ? undefined : { branding },
    isLoading: false,
  } as never);

const read = () => renderHook(() => useAuthHeroMedia()).result.current;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useAuthHeroMedia', () => {
  it('has no hero while branding has not loaded', () => {
    withBranding(undefined);
    expect(read()).toEqual({ videoUrl: '', imageUrl: '', hasHero: false });
  });

  it('ignores a picked asset whose switch is off', () => {
    withBranding({
      login_background_image_enabled: false,
      login_background_image_url: 'https://cdn/pic.jpg',
      login_background_video_enabled: false,
      login_background_video_url: 'https://cdn/clip.mp4',
    });
    expect(read()).toEqual({ videoUrl: '', imageUrl: '', hasHero: false });
  });

  it('offers the image when only its switch is on', () => {
    withBranding({
      login_background_image_enabled: true,
      login_background_image_url: 'https://cdn/pic.jpg',
      login_background_video_enabled: false,
      login_background_video_url: 'https://cdn/clip.mp4',
    });
    expect(read()).toEqual({ videoUrl: '', imageUrl: 'https://cdn/pic.jpg', hasHero: true });
  });

  it('offers the video when only its switch is on', () => {
    withBranding({
      login_background_image_enabled: false,
      login_background_video_enabled: true,
      login_background_video_url: 'https://cdn/clip.mp4',
    });
    expect(read()).toEqual({ videoUrl: 'https://cdn/clip.mp4', imageUrl: '', hasHero: true });
  });

  it('has no hero when a switch is on but its asset was never set', () => {
    withBranding({
      login_background_image_enabled: true,
      login_background_image_url: null,
      login_background_video_enabled: true,
    });
    expect(read()).toEqual({ videoUrl: '', imageUrl: '', hasHero: false });
  });
});
