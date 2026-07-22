import '@testing-library/jest-dom/vitest';
import type { ReactElement } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { describe, expect, it, vi } from 'vitest';
import ClubsGrid from '../ClubsGrid';
import { ACTIVE_ADS, type PublicAd } from '../../../components/ads/useActiveAds';

const ad = (overrides: Partial<PublicAd> = {}): PublicAd & { __typename: string } => ({
  __typename: 'PublicAd',
  id: 'ad-1',
  ad_type: 'IMAGE',
  media_url: 'https://cdn.example/ad-1.jpg',
  redirect_url: null,
  ad_title: 'Sponsored club promo',
  position: 'CLUB_LIST',
  ...overrides,
});

const adsMock = (ads: unknown[]) => ({
  request: { query: ACTIVE_ADS, variables: { position: 'CLUB_LIST' } },
  result: { data: { activeAds: ads } },
});

const makeClubs = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: `club-${i + 1}`,
    club_name: `Club ${i + 1}`,
  }));

const setup = (mocks: any[], ui: ReactElement) =>
  render(<MockedProvider mocks={mocks}>{ui}</MockedProvider>);

describe('ClubsGrid', () => {
  it('renders a card for each club with the pod count', () => {
    const clubs = makeClubs(3);
    const podCounts = new Map([['club-1', 5], ['club-2', 1]]);
    setup([adsMock([])], <ClubsGrid clubs={clubs} podCounts={podCounts} onOpen={vi.fn()} />);

    expect(screen.getByText('Club 1')).toBeInTheDocument();
    expect(screen.getByText('Club 2')).toBeInTheDocument();
    expect(screen.getByText('Club 3')).toBeInTheDocument();
    // podCount pluralization + default 0 for club-3 (missing from the map)
    expect(screen.getByText('5 pods')).toBeInTheDocument();
    expect(screen.getByText('1 pod')).toBeInTheDocument();
    expect(screen.getByText('0 pods')).toBeInTheDocument();
  });

  it('fires onOpen when a club card is opened', () => {
    const onOpen = vi.fn();
    const clubs = makeClubs(1);
    setup([adsMock([])], <ClubsGrid clubs={clubs} podCounts={new Map()} onOpen={onOpen} />);

    fireEvent.click(screen.getByRole('button', { name: /open club/i }));
    expect(onOpen).toHaveBeenCalledWith(clubs[0]);
  });

  it('weaves a sponsored ad card after every 6 clubs', async () => {
    const clubs = makeClubs(7);
    setup(
      [adsMock([ad()])],
      <ClubsGrid clubs={clubs} podCounts={new Map()} onOpen={vi.fn()} />,
    );

    // Ad card appears once the CLUB_LIST query resolves.
    expect(await screen.findByTestId('ad-card')).toBeInTheDocument();
    expect(screen.getByText('Sponsored')).toBeInTheDocument();
    // All 7 clubs still render alongside the interleaved ad.
    expect(screen.getByText('Club 7')).toBeInTheDocument();
  });

  it('renders clubs only when no ad inventory is available', async () => {
    const clubs = makeClubs(8);
    setup([adsMock([])], <ClubsGrid clubs={clubs} podCounts={new Map()} onOpen={vi.fn()} />);

    await waitFor(() => expect(screen.queryByTestId('ad-card')).not.toBeInTheDocument());
    expect(screen.getByText('Club 8')).toBeInTheDocument();
  });

  it('renders an empty grid without crashing when there are no clubs', () => {
    const { container } = setup(
      [adsMock([])],
      <ClubsGrid clubs={[]} podCounts={new Map()} onOpen={vi.fn()} />,
    );
    expect(container.querySelector('.MuiCard-root')).toBeNull();
  });
});
