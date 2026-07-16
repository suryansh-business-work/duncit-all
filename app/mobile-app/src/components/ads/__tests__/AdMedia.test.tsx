import { screen } from '@testing-library/react-native';
import { useVideoPlayer } from 'expo-video';

import { AdMedia } from '@/components/ads/AdMedia';
import { AdMediaType, AdPosition } from '@/generated/graphql/graphql';
import type { ActiveAd } from '@/hooks/useActiveAds';
import { renderWithProviders } from '@/utils/test-utils';

const mockUseVideoPlayer = useVideoPlayer as jest.Mock;

const ad = (ad_type: AdMediaType): ActiveAd => ({
  id: 'a1',
  ad_type,
  media_url: 'https://cdn/ad-media',
  redirect_url: null,
  ad_title: 'Try Duncit',
  position: AdPosition.Auto,
});

describe('AdMedia', () => {
  it('renders an image ad through the cached AppImage', () => {
    renderWithProviders(<AdMedia ad={ad(AdMediaType.Image)} testID="ad-m" />);
    expect(screen.getByTestId('ad-m-image')).toBeOnTheScreen();
    expect(screen.getByTestId('ad-m-image').props.source).toEqual({
      uri: 'https://cdn/ad-media',
    });
  });

  it('renders a video ad as a muted looping autoplay card video by default', () => {
    renderWithProviders(<AdMedia ad={ad(AdMediaType.Video)} testID="ad-m" />);
    expect(screen.getByTestId('ad-m-video')).toBeOnTheScreen();
    const player = mockUseVideoPlayer.mock.results.at(-1)?.value;
    expect(player.loop).toBe(true);
    expect(player.muted).toBe(true);
    expect(player.play).toHaveBeenCalled();
  });

  it('keeps a gated video paused while inactive', () => {
    renderWithProviders(<AdMedia ad={ad(AdMediaType.Video)} testID="ad-m" isActive={false} />);
    const player = mockUseVideoPlayer.mock.results.at(-1)?.value;
    expect(player.pause).toHaveBeenCalled();
    expect(player.play).not.toHaveBeenCalled();
  });
});
