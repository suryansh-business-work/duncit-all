import { screen } from '@testing-library/react-native';

import { AdSlot } from '@/components/ads/AdSlot';
import { AdMediaType, AdPosition } from '@/generated/graphql/graphql';
import { useActiveAds, type ActiveAd } from '@/hooks/useActiveAds';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useActiveAds', () => ({ useActiveAds: jest.fn() }));
const mockedAds = useActiveAds as jest.Mock;

const ad = (id: string): ActiveAd => ({
  id,
  ad_type: AdMediaType.Image,
  media_url: `https://cdn/${id}.jpg`,
  redirect_url: null,
  ad_title: `Ad ${id}`,
  position: AdPosition.Auto,
});

describe('AdSlot', () => {
  it('renders nothing while the position has no live ads', () => {
    mockedAds.mockReturnValue({ ads: [], loading: false });
    renderWithProviders(<AdSlot position="HOME_BOTTOM" variant="banner" />);
    expect(mockedAds).toHaveBeenCalledWith('HOME_BOTTOM');
    expect(screen.queryByTestId('ad-slot-HOME_BOTTOM')).toBeNull();
  });

  it('renders the first live ad as a card for its position', () => {
    mockedAds.mockReturnValue({ ads: [ad('a1'), ad('a2')], loading: false });
    renderWithProviders(<AdSlot position="SIDEBAR" variant="card" />);
    expect(screen.getByTestId('ad-slot-SIDEBAR')).toBeOnTheScreen();
    expect(screen.getByText('Ad a1')).toBeOnTheScreen();
    expect(screen.queryByText('Ad a2')).toBeNull();
  });

  it('renders the tile variant for the story rail', () => {
    mockedAds.mockReturnValue({ ads: [ad('a3')], loading: false });
    renderWithProviders(<AdSlot position="STATUS" variant="tile" />);
    expect(screen.getByTestId('ad-slot-STATUS-sponsored')).toBeOnTheScreen();
  });
});
