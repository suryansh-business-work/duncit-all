import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

const h = vi.hoisted(() => ({
  home: vi.fn(),
  saved: { signedIn: false } as Record<string, unknown>,
  nearby: undefined as undefined | Record<string, any>,
  rail: undefined as undefined | Record<string, any>,
  section: [] as Array<Record<string, any>>,
  search: undefined as undefined | Record<string, any>,
}));

vi.mock('../useHomeData', () => ({ useHomeData: (args: unknown) => h.home(args) }));
vi.mock('../../../hooks/useSavedPodHearts', () => ({ useSavedPodHearts: () => h.saved }));
vi.mock('../HomeSkeleton', () => ({ default: () => <div>skeleton</div> }));
vi.mock('../HomeStatusRail', () => ({
  default: (p: Record<string, any>) => {
    h.rail = p;
    return <div>status-rail</div>;
  },
}));
vi.mock('../HomeNearbySection', () => ({
  default: (p: Record<string, any>) => {
    h.nearby = p;
    return <div>nearby</div>;
  },
}));
vi.mock('../ClubSection', () => ({
  default: (p: Record<string, any>) => {
    h.section.push(p);
    return <div>{`club:${p.club.id}`}</div>;
  },
}));
vi.mock('../HomeSearch', () => ({
  default: (p: Record<string, any>) => {
    h.search = p;
    return <div>search</div>;
  },
}));
vi.mock('../FilterMenu', () => ({ default: () => <div>filter</div> }));
vi.mock('../HomeVibeChips', () => ({ default: () => <div>vibe</div> }));
vi.mock('../OngoingPodsRail', () => ({ default: () => <div>ongoing</div> }));
vi.mock('../PreviousPodsRail', () => ({ default: () => <div>previous</div> }));
vi.mock('../ClubRecommendationRow', () => ({ default: () => <div>recommendation</div> }));
vi.mock('../SomethingForYouRail', () => ({ default: () => <div>something</div> }));
vi.mock('../../../components/ads/AdSlot', () => ({ default: () => <div>ad</div> }));

import HomePage from '../HomePage';

const feed = (over: Record<string, unknown> = {}) => ({
  data: { pods: [{ id: 'p1' }], clubs: [{ id: 'c1' }] },
  loading: false,
  error: undefined,
  branding: {},
  me: { user_id: 'u1' },
  isHost: false,
  clubs: [{ id: 'c1' }],
  featuredPods: [],
  podsByClub: new Map([['c1', [{ id: 'p1' }]]]),
  categoryChips: [],
  vibeCategories: [],
  followedClubs: [],
  followedPosts: [],
  clubStories: [],
  myStories: [{ id: 'st1' }],
  followedUsers: [],
  locations: [],
  totalPods: 0,
  ongoingPods: [],
  previousPods: [],
  hostNameOf: () => null,
  categoryLabelOf: () => null,
  ...over,
});

const page = () =>
  render(
    <MemoryRouter>
      <HomePage superCategorySlug="sports" locationId="loc1" zoneName="zone" />
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  h.saved = { signedIn: false };
  h.section = [];
  h.nearby = undefined;
  h.rail = undefined;
});

describe('HomePage wiring', () => {
  it('hides the save buttons for a signed-out visitor', () => {
    h.home.mockReturnValue(feed());
    page();
    expect(h.nearby?.savedOf).toBeUndefined();
    expect(h.nearby?.savingOf).toBeUndefined();
    expect(h.nearby?.onToggleSave).toBeUndefined();
    expect(h.section[0].savedOf).toBeUndefined();
  });

  it('passes the save state through to the rails for a signed-in member', () => {
    const isSaved = vi.fn();
    const isSaving = vi.fn();
    const toggle = vi.fn();
    h.saved = { signedIn: true, isSaved, isSaving, toggle };
    h.home.mockReturnValue(feed());
    page();
    expect(h.nearby?.savedOf).toBe(isSaved);
    expect(h.nearby?.savingOf).toBe(isSaving);
    expect(h.nearby?.onToggleSave).toBe(toggle);
    expect(h.section[0].onToggleSave).toBe(toggle);
  });

  it('gives the status rail the member with their own stories attached, or no member when signed out', () => {
    h.home.mockReturnValue(feed());
    const { unmount } = page();
    expect(h.rail?.me).toEqual({ user_id: 'u1', my_stories: [{ id: 'st1' }] });
    unmount();
    h.home.mockReturnValue(feed({ me: null }));
    page();
    expect(h.rail?.me).toBeNull();
  });

  it('gives a club with no upcoming pods an empty list', () => {
    h.home.mockReturnValue(feed({ podsByClub: new Map() }));
    page();
    expect(h.section[0].clubPods).toEqual([]);
  });

  it('disables search when the feed has no pods and no clubs, even if the lists are missing', () => {
    h.home.mockReturnValue(feed({ data: {}, clubs: [] }));
    page();
    expect(h.search?.disabled).toBe(true);
  });

  it('disables search when only clubs are missing, and enables it with pods but no clubs list', () => {
    h.home.mockReturnValue(feed({ data: { pods: [] }, clubs: [] }));
    const { unmount } = page();
    expect(h.search?.disabled).toBe(true);
    unmount();
    h.home.mockReturnValue(feed({ data: { pods: [{ id: 'p' }] }, clubs: [] }));
    page();
    expect(h.search?.disabled).toBe(false);
  });

  it('enables search when there are clubs but no pods', () => {
    h.home.mockReturnValue(feed({ data: { clubs: [{ id: 'c' }] } }));
    page();
    expect(h.search?.disabled).toBe(false);
  });
});
