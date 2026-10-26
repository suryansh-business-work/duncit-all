import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';

import HomeStatusRail from '../HomeStatusRail';

const h = vi.hoisted(() => ({
  ads: [] as unknown[],
  official: { entry: null as unknown, recordView: vi.fn() },
}));

vi.mock('../MyStatusUploadTile', () => ({
  default: (p: { onView: () => void }) => <button data-testid="my-status" onClick={p.onView} />,
}));
vi.mock('../StoryViewersDialog', () => ({ default: () => null }));
vi.mock('../../../components/ads/useActiveAds', () => ({ useActiveAds: () => ({ ads: h.ads, loading: false }) }));
vi.mock('../../../components/ads/AdTile', () => ({
  default: (p: { onOpen: () => void }) => <button data-testid="ad-slot" onClick={p.onOpen} />,
}));
vi.mock('../useOfficialStatuses', () => ({ useOfficialStatuses: () => h.official }));
vi.mock('../HomeStatusTile', () => ({
  default: (p: { testId: string; label: string; onClick: () => void }) => (
    <button data-testid={p.testId} onClick={p.onClick}>
      {p.label}
    </button>
  ),
}));
vi.mock('../HomeStatusViewer', () => ({
  default: (p: Record<string, any>) =>
    p.item ? (
      <div data-testid="viewer" data-kind={p.item.kind} data-label={p.item.label} data-has-next={String(Boolean(p.onNext))} data-has-prev={String(Boolean(p.onPrev))} data-report={String(p.canReport)}>
        <button data-testid="v-close" onClick={p.onClose} />
        {p.onNext && <button data-testid="v-next" onClick={p.onNext} />}
        {p.onPrev && <button data-testid="v-prev" onClick={p.onPrev} />}
        {p.onRecordView && <button data-testid="v-record" onClick={() => p.onRecordView('slide-1')} />}
      </div>
    ) : null,
}));

const future = new Date(Date.now() + 3_600_000).toISOString();
const user = (id: string) => ({ user_id: id, full_name: `User ${id}`, first_name: `U${id}` });
const post = (id: string, author: string) => ({ id, author_id: author, image_url: `${id}.jpg`, media_type: 'IMAGE', expires_at: future, seen_by_me: false });
const officialEntry = {
  key: 'official',
  label: 'Duncit',
  initials: 'D',
  active: true,
  imageUrl: 'o.jpg',
  videoUrl: null,
  viewer: { kind: 'official', label: 'Duncit Official', slides: [] },
};

const rail = (props: Record<string, unknown> = {}) =>
  render(
    <MockedProvider mocks={[]}>
      <HomeStatusRail
        me={{ full_name: 'Me' }}
        followedClubs={[]}
        followedUsers={[user('1'), user('2')]}
        followedPosts={[post('p1', '1'), post('p2', '2')]}
        {...(props as object)}
      />
    </MockedProvider>
  );

beforeEach(() => {
  vi.clearAllMocks();
  // 0.99 makes the rail's shuffle keep its order, so tile positions are stable.
  vi.spyOn(Math, 'random').mockReturnValue(0.99);
  h.ads = [];
  h.official = { entry: null, recordView: vi.fn() };
});

describe('HomeStatusRail pinned stories', () => {
  it('has no sponsored tile without an ad', () => {
    rail();
    expect(screen.queryByTestId('ad-slot')).not.toBeInTheDocument();
  });

  it('opens the sponsored story on its own with no next or previous, and closes it', () => {
    h.ads = [{ id: 'ad1', ad_type: 'IMAGE', media_url: 'ad.jpg', redirect_url: 'https://ad.example', ad_title: 'Sale', position: 'STATUS' }];
    rail();
    fireEvent.click(screen.getByTestId('ad-slot'));
    const viewer = screen.getByTestId('viewer');
    expect(viewer).toHaveAttribute('data-kind', 'ad');
    expect(viewer).toHaveAttribute('data-has-next', 'false');
    expect(viewer).toHaveAttribute('data-has-prev', 'false');
    expect(viewer).toHaveAttribute('data-report', 'false');
    expect(screen.queryByTestId('v-record')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('v-close'));
    expect(screen.queryByTestId('viewer')).not.toBeInTheDocument();
  });

  it('pins the Duncit tile first, opens it with no walking and records its slides as Duncit views', () => {
    h.official = { entry: officialEntry, recordView: vi.fn() };
    rail();
    fireEvent.click(screen.getByTestId('status-official-tile'));
    const viewer = screen.getByTestId('viewer');
    expect(viewer).toHaveAttribute('data-kind', 'official');
    expect(viewer).toHaveAttribute('data-has-next', 'false');
    fireEvent.click(screen.getByTestId('v-record'));
    expect(h.official.recordView).toHaveBeenCalledWith('slide-1');
    fireEvent.click(screen.getByTestId('v-close'));
    expect(screen.queryByTestId('viewer')).not.toBeInTheDocument();
  });

  it('shows no Duncit tile when nothing official is live', () => {
    rail();
    expect(screen.queryByTestId('status-official-tile')).not.toBeInTheDocument();
  });
});

describe('HomeStatusRail walking between stories', () => {
  it('walks to the next and previous follower, stops at the first, and closes past the last', () => {
    rail({ me: {} });
    fireEvent.click(screen.getByTestId('status-user-1'));
    expect(screen.getByTestId('viewer')).toHaveAttribute('data-label', 'U1');
    expect(screen.getByTestId('viewer')).toHaveAttribute('data-report', 'true');
    fireEvent.click(screen.getByTestId('v-prev'));
    expect(screen.getByTestId('viewer')).toHaveAttribute('data-label', 'U1');
    fireEvent.click(screen.getByTestId('v-next'));
    expect(screen.getByTestId('viewer')).toHaveAttribute('data-label', 'U2');
    fireEvent.click(screen.getByTestId('v-prev'));
    expect(screen.getByTestId('viewer')).toHaveAttribute('data-label', 'U1');
    fireEvent.click(screen.getByTestId('v-next'));
    fireEvent.click(screen.getByTestId('v-next'));
    expect(screen.queryByTestId('viewer')).not.toBeInTheDocument();
  });

  it('closes the viewer when the story it showed is gone from under it', () => {
    const withStory = { full_name: 'Me', my_stories: [{ id: 's1', image_url: 'm.jpg', media_type: 'IMAGE', expires_at: future }] };
    const view = (me: object) => (
      <MockedProvider mocks={[]}>
        <HomeStatusRail me={me} followedClubs={[]} followedUsers={[user('1'), user('2')]} followedPosts={[post('p1', '1'), post('p2', '2')]} />
      </MockedProvider>
    );
    const { rerender } = render(view(withStory));
    fireEvent.click(screen.getByTestId('status-user-2'));
    expect(screen.getByTestId('viewer')).toHaveAttribute('data-label', 'U2');
    rerender(view({ full_name: 'Me' }));
    expect(screen.queryByTestId('viewer')).not.toBeInTheDocument();
  });

  it('closes the Duncit viewer when its statuses expire while it is open', () => {
    h.official = { entry: officialEntry, recordView: vi.fn() };
    const view = () => (
      <MockedProvider mocks={[]}>
        <HomeStatusRail me={{}} followedClubs={[]} followedUsers={[]} followedPosts={[]} />
      </MockedProvider>
    );
    const { rerender } = render(view());
    fireEvent.click(screen.getByTestId('status-official-tile'));
    expect(screen.getByTestId('viewer')).toBeInTheDocument();
    h.official = { entry: null, recordView: vi.fn() };
    rerender(view());
    expect(screen.queryByTestId('viewer')).not.toBeInTheDocument();
  });
});
