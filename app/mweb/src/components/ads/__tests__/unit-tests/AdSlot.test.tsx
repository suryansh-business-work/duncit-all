import '@testing-library/jest-dom/vitest';
import type { ReactElement } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AdSlot from '../../AdSlot';
import { ACTIVE_ADS, type PublicAd } from '../../useActiveAds';

const ad = (overrides: Partial<PublicAd> = {}): PublicAd & { __typename: string } => ({
  __typename: 'PublicAd',
  id: 'ad-1',
  ad_type: 'IMAGE',
  media_url: 'https://cdn.example/ad-1.jpg',
  redirect_url: null,
  ad_title: 'Fresh brews nearby',
  position: 'HOME_BOTTOM',
  ...overrides,
});

const mock = (position: string, ads: unknown[]) => ({
  request: { query: ACTIVE_ADS, variables: { position } },
  result: { data: { activeAds: ads } },
});

const setup = (mocks: any[], ui: ReactElement) =>
  render(<MockedProvider mocks={mocks}>{ui}</MockedProvider>);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AdSlot', () => {
  it('renders the first ad as a Sponsored card with its title', async () => {
    setup([mock('HOME_BOTTOM', [ad(), ad({ id: 'ad-2' })])], <AdSlot position="HOME_BOTTOM" />);
    expect(await screen.findByTestId('ad-card')).toBeInTheDocument();
    expect(screen.getByText('Sponsored')).toBeInTheDocument();
    expect(screen.getByText('Fresh brews nearby')).toBeInTheDocument();
    expect(screen.getByAltText('Fresh brews nearby')).toBeInTheDocument();
  });

  it('renders nothing at all when the placement has no inventory', async () => {
    const { container } = setup([mock('POD_DETAILS', [])], <AdSlot position="POD_DETAILS" />);
    // Empty both while loading (no skeleton) and after the query resolves.
    expect(container).toBeEmptyDOMElement();
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('opens the redirect in a new tab on click and keyboard (accessible button)', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    setup(
      [mock('SIDEBAR', [ad({ redirect_url: 'https://brand.example' })])],
      <AdSlot position="SIDEBAR" variant="card" />,
    );
    const card = await screen.findByRole('button', { name: 'Sponsored: Fresh brews nearby' });
    fireEvent.click(card);
    expect(open).toHaveBeenCalledWith('https://brand.example', '_blank', 'noreferrer');
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(open).toHaveBeenCalledTimes(2);
  });

  it('is inert (no button role) when the ad has no redirect_url', async () => {
    setup([mock('HOME_BOTTOM', [ad()])], <AdSlot position="HOME_BOTTOM" />);
    await screen.findByTestId('ad-card');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders the status-rail tile shape for variant="tile"', async () => {
    setup(
      [mock('STATUS', [ad({ position: 'STATUS', ad_type: 'VIDEO' })])],
      <AdSlot position="STATUS" variant="tile" />,
    );
    expect(await screen.findByTestId('ad-tile')).toBeInTheDocument();
    expect(screen.getByText('Sponsored')).toBeInTheDocument();
  });
});
