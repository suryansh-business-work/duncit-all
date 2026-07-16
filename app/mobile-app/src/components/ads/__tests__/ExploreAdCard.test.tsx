import { Linking } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useVideoPlayer } from 'expo-video';

import { ExploreAdCard } from '@/components/ads/ExploreAdCard';
import { AdMediaType, AdPosition } from '@/generated/graphql/graphql';
import type { ActiveAd } from '@/hooks/useActiveAds';
import { renderWithProviders } from '@/utils/test-utils';

const mockUseVideoPlayer = useVideoPlayer as jest.Mock;

const ad = (over: Partial<ActiveAd> = {}): ActiveAd => ({
  id: 'a1',
  ad_type: AdMediaType.Video,
  media_url: 'https://cdn/ad.mp4',
  redirect_url: null,
  ad_title: 'Try Duncit Pro',
  position: AdPosition.ExploreScroll,
  ...over,
});

describe('ExploreAdCard', () => {
  it('plays the ad video only while the card is the active reel', () => {
    renderWithProviders(<ExploreAdCard ad={ad()} width={390} height={700} isActive />);
    expect(screen.getByTestId('ad-reel-a1')).toBeOnTheScreen();
    expect(screen.getByTestId('ad-reel-a1-sponsored')).toBeOnTheScreen();
    expect(screen.getByText('Try Duncit Pro')).toBeOnTheScreen();
    const player = mockUseVideoPlayer.mock.results.at(-1)?.value;
    expect(player.play).toHaveBeenCalled();
  });

  it('pauses the ad video while another reel is visible', () => {
    renderWithProviders(<ExploreAdCard ad={ad()} width={390} height={700} isActive={false} />);
    const player = mockUseVideoPlayer.mock.results.at(-1)?.value;
    expect(player.pause).toHaveBeenCalled();
    expect(player.play).not.toHaveBeenCalled();
  });

  it('shows the Learn-more CTA only with a redirect and opens the link', async () => {
    const openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    renderWithProviders(
      <ExploreAdCard
        ad={ad({ ad_type: AdMediaType.Image, redirect_url: 'https://duncit.com/pro' })}
        width={390}
        height={700}
        isActive
      />,
    );
    expect(screen.getByTestId('ad-reel-a1-image')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('ad-reel-a1-cta'));
    await waitFor(() => expect(openSpy).toHaveBeenCalledWith('https://duncit.com/pro'));
    openSpy.mockRestore();
  });

  it('hides the CTA without a redirect url', () => {
    renderWithProviders(<ExploreAdCard ad={ad()} width={390} height={700} isActive />);
    expect(screen.queryByTestId('ad-reel-a1-cta')).toBeNull();
  });
});
