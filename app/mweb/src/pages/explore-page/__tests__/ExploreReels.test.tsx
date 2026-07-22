import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { describe, expect, it, vi } from 'vitest';
import ExploreReels from '../ExploreReels';
import { ACTIVE_ADS, type PublicAd } from '../../../components/ads/useActiveAds';

// Passthrough for react-slick so children render synchronously in jsdom.
vi.mock('react-slick', () => ({
  default: ({ children }: { children: ReactNode }) => <div data-testid="slider">{children}</div>,
}));

// Light stubs so we test ExploreReels' wiring, not the heavy child trees.
vi.mock('../ExplorePodCard', () => ({
  default: ({ pod, club, location, saved, savePending, onToggleSave, viewerId }: any) => (
    <div data-testid="pod-card">
      <span>title:{pod.pod_title}</span>
      <span>club:{club?.name ?? 'none'}</span>
      <span>loc:{location?.name ?? 'none'}</span>
      <span>saved:{String(saved)}</span>
      <span>pending:{String(savePending)}</span>
      <span>viewer:{viewerId ?? 'anon'}</span>
      <button type="button" onClick={onToggleSave}>
        save-{pod.id}
      </button>
    </div>
  ),
}));

vi.mock('../../../components/ads/AdSlide', () => ({
  default: ({ ad }: { ad: PublicAd }) => <div data-testid="ad-slide">ad:{ad.id}</div>,
}));

const ad = (id: string): PublicAd & { __typename: string } => ({
  __typename: 'PublicAd',
  id,
  ad_type: 'IMAGE',
  media_url: `https://cdn.example/${id}.jpg`,
  redirect_url: null,
  ad_title: 'Sponsored',
  position: 'EXPLORE_SCROLL',
});

const makePods = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: `pod-${i}`,
    pod_title: `Pod ${i}`,
    club_id: `club-${i}`,
    location_id: `loc-${i}`,
  }));

const adsMock = (ads: unknown[]) => ({
  request: { query: ACTIVE_ADS, variables: { position: 'EXPLORE_SCROLL' } },
  result: { data: { activeAds: ads } },
});

const baseProps = (over: Partial<Parameters<typeof ExploreReels>[0]> = {}) => ({
  pods: makePods(6),
  clubsById: new Map([['club-0', { name: 'Club Zero' }]]),
  locById: new Map([['loc-0', { name: 'Loc Zero' }]]),
  viewerId: 'viewer-1',
  isSaved: (id: string) => id === 'pod-0',
  pendingSave: new Set<string>(['pod-1']),
  onToggleSave: vi.fn(),
  ...over,
});

const setup = (props: any, mocks: any[]) =>
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <ExploreReels {...props} />
    </MockedProvider>,
  );

describe('ExploreReels', () => {
  it('renders one pod card per pod when there is no ad inventory', async () => {
    const props = baseProps();
    setup(props, [adsMock([])]);
    await waitFor(() => expect(screen.getAllByTestId('pod-card')).toHaveLength(6));
    expect(screen.queryByTestId('ad-slide')).not.toBeInTheDocument();
    // Wiring of resolved club/location and per-pod flags.
    expect(screen.getByText('club:Club Zero')).toBeInTheDocument();
    expect(screen.getByText('loc:Loc Zero')).toBeInTheDocument();
    expect(screen.getByText('saved:true')).toBeInTheDocument();
    expect(screen.getByText('pending:true')).toBeInTheDocument();
    expect(screen.getAllByText('viewer:viewer-1')).toHaveLength(6);
  });

  it('weaves a sponsored slide after every 5 reels when ads exist', async () => {
    const props = baseProps();
    setup(props, [adsMock([ad('ad-1')])]);
    // 6 pods + 1 ad interleaved after the 5th pod.
    await waitFor(() => expect(screen.getByTestId('ad-slide')).toBeInTheDocument());
    expect(screen.getByText('ad:ad-1')).toBeInTheDocument();
    expect(screen.getAllByTestId('pod-card')).toHaveLength(6);
  });

  it('fires onToggleSave with the pod id when a card save button is clicked', async () => {
    const onToggleSave = vi.fn();
    const props = baseProps({ onToggleSave });
    setup(props, [adsMock([])]);
    const btn = await screen.findByText('save-pod-2');
    fireEvent.click(btn);
    expect(onToggleSave).toHaveBeenCalledWith('pod-2');
  });

  it('handles an empty pod list without rendering any card', async () => {
    const props = baseProps({ pods: [] });
    setup(props, [adsMock([ad('ad-1')])]);
    await waitFor(() => expect(screen.queryByTestId('pod-card')).not.toBeInTheDocument());
    // With zero items no ad is woven in either.
    expect(screen.queryByTestId('ad-slide')).not.toBeInTheDocument();
  });

  it('falls back to undefined club/location for unmapped ids and anon viewer', async () => {
    const props = baseProps({
      pods: makePods(2),
      clubsById: new Map(),
      locById: new Map(),
      viewerId: null,
    });
    setup(props, [adsMock([])]);
    await waitFor(() => expect(screen.getAllByTestId('pod-card')).toHaveLength(2));
    expect(screen.getAllByText('club:none')).toHaveLength(2);
    expect(screen.getAllByText('viewer:anon')).toHaveLength(2);
  });
});
