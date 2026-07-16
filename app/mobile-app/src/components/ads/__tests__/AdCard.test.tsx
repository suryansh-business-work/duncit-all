import { Linking } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { AdCard } from '@/components/ads/AdCard';
import { AdMediaType, AdPosition } from '@/generated/graphql/graphql';
import type { ActiveAd } from '@/hooks/useActiveAds';
import { renderWithProviders } from '@/utils/test-utils';

const ad = (redirect_url: string | null = null): ActiveAd => ({
  id: 'a1',
  ad_type: AdMediaType.Image,
  media_url: 'https://cdn/ad.jpg',
  redirect_url,
  ad_title: 'Try Duncit',
  position: AdPosition.HomeBottom,
});

describe('AdCard', () => {
  it('opens the advertiser link on press when a redirect is set', async () => {
    const openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    renderWithProviders(<AdCard ad={ad('https://duncit.com/pro')} variant="banner" />);
    expect(screen.getByText('Try Duncit')).toBeOnTheScreen();
    expect(screen.getByTestId('ad-card-a1-sponsored')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('ad-card-a1'));
    await waitFor(() => expect(openSpy).toHaveBeenCalledWith('https://duncit.com/pro'));
    openSpy.mockRestore();
  });

  it('surfaces a failed redirect open without crashing (fire-and-forget)', async () => {
    const openSpy = jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('no handler'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    renderWithProviders(<AdCard ad={ad('https://duncit.com/pro')} variant="banner" />);
    fireEvent.press(screen.getByTestId('ad-card-a1'));
    await waitFor(() => expect(errorSpy).toHaveBeenCalled());
    openSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('is inert without a redirect url', () => {
    const openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    renderWithProviders(<AdCard ad={ad()} variant="banner" />);
    fireEvent.press(screen.getByTestId('ad-card-a1'));
    expect(openSpy).not.toHaveBeenCalled();
    openSpy.mockRestore();
  });

  it('self-pads the sidebar card variant and honours a custom testID', () => {
    renderWithProviders(<AdCard ad={ad()} variant="card" testID="ad-slot-SIDEBAR" />);
    expect(screen.getByTestId('ad-slot-SIDEBAR')).toBeOnTheScreen();
    expect(screen.getByTestId('ad-slot-SIDEBAR-sponsored')).toBeOnTheScreen();
  });

  it('renders the story-rail tile with its label and tiny badge', () => {
    renderWithProviders(<AdCard ad={ad('https://duncit.com')} variant="tile" />);
    expect(screen.getByTestId('ad-card-a1')).toBeOnTheScreen();
    expect(screen.getByTestId('ad-card-a1-sponsored')).toBeOnTheScreen();
    expect(screen.getByText('Try Duncit')).toBeOnTheScreen();
  });

  it('renders an inert tile without a redirect url', () => {
    const openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    renderWithProviders(<AdCard ad={ad()} variant="tile" />);
    fireEvent.press(screen.getByTestId('ad-card-a1'));
    expect(openSpy).not.toHaveBeenCalled();
    openSpy.mockRestore();
  });
});
