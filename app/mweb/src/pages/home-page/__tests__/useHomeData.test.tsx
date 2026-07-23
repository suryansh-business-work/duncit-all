import { renderHook, waitFor, act } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { gql } from '@apollo/client';
import { describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import { HEADER_DATA, HOME_REFRESH_EVENT } from '../../../components/app-header/queries';
import { HOME_DATA, FOLLOWED_USERS } from '../queries';
import { useHomeData } from '../useHomeData';

// Re-declared identically to the (unexported) query inside useFollowedClubs so
// MockedProvider matches it by document equivalence.
const FOLLOWED_CLUBS = gql`
  query FollowedClubIds {
    me {
      user_id
      following_club_ids
    }
  }
`;

const isoDaysFromNow = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
};

const CATEGORIES = [
  { id: 's1', name: 'Sports', slug: 'sports', icon: 's', level: 'SUPER', parent_id: null },
  {
    id: 'c1',
    name: 'Racquet',
    slug: 'racquet',
    icon: 'r',
    level: 'CATEGORY',
    parent_id: 's1',
    icon_layout_mweb: { position: 'LEFT', width: 50, height: 30 },
  },
  { id: 'sub1', name: 'Badminton', slug: 'badminton', icon: null, level: 'SUB', parent_id: 'c1' },
  { id: 'c2', name: 'Ball', slug: 'ball', icon: null, level: 'CATEGORY', parent_id: 's1' },
  { id: 's2', name: 'Music', slug: 'music', icon: 'm', level: 'SUPER', parent_id: null },
  { id: 'c3', name: 'Rock', slug: 'rock', icon: null, level: 'CATEGORY', parent_id: 's2' },
];

const CLUBS = [
  { id: 'club1', category_id: 'c1', super_category_id: 's1' },
  // no super_category_id -> resolved via catSuperMap from category_id sub1
  { id: 'club2', category_id: 'sub1', super_category_id: null },
  { id: 'club3', category_id: 'c3', super_category_id: 's2' },
  // club with no category at all
  { id: 'club4', category_id: null, super_category_id: null },
];

const PODS = [
  {
    id: 'p_past',
    club_id: 'club1',
    pod_date_time: isoDaysFromNow(-2),
    pod_type: 'NATIVE_PAID',
    pod_amount: 100,
    pod_hosts_id: ['h1'],
    host_names: ['Alice'],
  },
  {
    id: 'p_future3',
    club_id: 'club1',
    pod_date_time: isoDaysFromNow(3),
    pod_type: 'NATIVE_FREE',
    pod_amount: 0,
    pod_hosts_id: ['me1'],
    host_names: null,
  },
  {
    id: 'p_future10',
    club_id: 'club1',
    pod_date_time: isoDaysFromNow(10),
    pod_type: 'NATIVE_PAID_PREMIUM',
    pod_amount: 500,
    pod_hosts_id: ['h1'],
    host_names: [],
  },
  {
    id: 'p_future40',
    club_id: 'club2',
    pod_date_time: isoDaysFromNow(40),
    pod_type: 'NON_NATIVE_PAID',
    pod_amount: 250,
    pod_hosts_id: ['h2'],
    host_names: null,
  },
  {
    id: 'p_music',
    club_id: 'club3',
    pod_date_time: isoDaysFromNow(2),
    pod_type: 'NATIVE_PAID',
    pod_amount: 50,
    pod_hosts_id: [],
    host_names: null,
  },
  {
    id: 'p_nodate',
    club_id: 'club1',
    pod_date_time: null,
    pod_type: 'NATIVE_PAID',
    pod_amount: 10,
    pod_hosts_id: ['unknown'],
    host_names: null,
  },
  // pod on a club that is not in CLUBS -> filtered out (club lookup miss)
  {
    id: 'p_orphan',
    club_id: 'ghost',
    pod_date_time: isoDaysFromNow(1),
    pod_type: 'NATIVE_PAID',
    pod_amount: 10,
    pod_hosts_id: [],
    host_names: null,
  },
];

const PUBLIC_HOSTS = [
  { user_id: 'h1', full_name: 'Host One' },
  { user_id: 'h2', full_name: 'Host Two' },
  { user_id: 'hx', full_name: null },
];

const STORIES = [
  { id: 'st1', author_id: 'u2' },
  { id: 'st2', author_id: 'me1' },
  { id: 'st3', author_id: 'nobody' },
];

const homeDataMock = (locationId: string, zoneName: string) => ({
  request: {
    query: HOME_DATA,
    variables: {
      podFilter: {
        location_id: locationId || undefined,
        zone_name: zoneName || undefined,
        is_active: true,
      },
    },
  },
  result: {
    data: {
      clubs: CLUBS,
      pods: PODS,
      publicHosts: PUBLIC_HOSTS,
      stories: STORIES,
      categories: CATEGORIES,
    },
  },
});

const headerMock = {
  request: { query: HEADER_DATA },
  result: {
    data: {
      branding: { app_name: 'Duncit' },
      me: { user_id: 'me1', roles: ['HOST'], following_user_ids: ['u2'] },
      superCategories: [],
      locations: [],
      activePodLocationIds: [],
    },
  },
};

const followedClubsMock = {
  request: { query: FOLLOWED_CLUBS },
  result: { data: { me: { user_id: 'me1', following_club_ids: ['club1'] } } },
};

const followedUsersMock = {
  request: { query: FOLLOWED_USERS, variables: { userIds: ['u2'] } },
  result: {
    data: {
      publicUsersByIds: [{ user_id: 'u2', full_name: 'Bob', first_name: 'Bob', profile_photo: null }],
    },
  },
};

function wrapperWith(mocks: any[]) {
  return ({ children }: { children: ReactNode }) => (
    <MockedProvider mocks={mocks} addTypename={false}>
      {children}
    </MockedProvider>
  );
}

const baseParams = {
  superCategorySlug: '',
  locationId: 'loc1',
  zoneName: 'zoneA',
  categoryId: '',
  priceFilter: 'ALL' as const,
  dateFilter: 'ALL' as const,
  sortBy: 'DATE_ASC' as const,
};

describe('useHomeData', () => {
  it('returns empty defaults before data resolves', () => {
    const { result } = renderHook(() => useHomeData(baseParams), {
      wrapper: wrapperWith([]),
    });
    expect(result.current.loading).toBe(true);
    expect(result.current.clubs).toEqual([]);
    expect(result.current.featuredPods).toEqual([]);
    expect(result.current.totalPods).toBe(0);
    expect(result.current.categoryChips).toEqual([]);
    expect(result.current.vibeCategories).toEqual([]);
    expect(result.current.previousPods).toEqual([]);
    expect(result.current.hostPods).toEqual([]);
    expect(result.current.followedPosts).toEqual([]);
    expect(result.current.myStories).toEqual([]);
  });

  it('builds the full feed with no super-category selected', async () => {
    const { result } = renderHook(() => useHomeData(baseParams), {
      wrapper: wrapperWith([
        homeDataMock('loc1', 'zoneA'),
        headerMock,
        followedClubsMock,
        followedUsersMock,
      ]),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    // isHost derived from roles, branding + me surfaced
    expect(result.current.isHost).toBe(true);
    expect(result.current.branding?.app_name).toBe('Duncit');
    expect(result.current.me?.user_id).toBe('me1');

    // active pods exclude the past one and the orphan (no club); previous holds the past pod
    expect(result.current.previousPods.map((p: any) => p.id)).toEqual(['p_past']);
    expect(result.current.activePods.some((p: any) => p.id === 'p_orphan')).toBe(false);
    expect(result.current.totalPods).toBe(result.current.activePods.length);
    expect(result.current.totalPods).toBeGreaterThan(0);

    // featured pods sorted ascending by date, capped at 6
    expect(result.current.featuredPods.length).toBeLessThanOrEqual(6);

    // clubs kept only when they have active pods
    const clubIds = result.current.clubs.map((c: any) => c.id).sort();
    expect(clubIds).toContain('club1');
    expect(clubIds).not.toContain('club4');

    // podsByClub grouping
    expect(result.current.podsByClub.get('club1')?.length).toBeGreaterThan(0);

    // followed clubs (club1 is followed and in scope)
    expect(result.current.followedClubs.map((c: any) => c.id)).toEqual(['club1']);

    // hostPods: pods where I am a host (p_future3)
    expect(result.current.hostPods.map((p: any) => p.id)).toContain('p_future3');

    // followedPosts (author u2) + myStories (author me1)
    expect(result.current.followedPosts.map((p: any) => p.id)).toEqual(['st1']);
    expect(result.current.myStories.map((p: any) => p.id)).toEqual(['st2']);

    // followed users resolved from FOLLOWED_USERS
    await waitFor(() => expect(result.current.followedUsers).toHaveLength(1));

    // category chips (no-super branch) + vibe categories built
    expect(result.current.categoryChips.length).toBeGreaterThan(0);
    expect(result.current.vibeCategories.length).toBeGreaterThan(0);
    expect(result.current.vibeCategories[0]).toHaveProperty('subs');

    // per-category mWeb icon layout is carried through onto the built object;
    // a category without one gets null.
    const racquet = result.current.vibeCategories.find((c: any) => c.id === 'c1');
    expect(racquet?.iconLayout).toEqual({ position: 'LEFT', width: 50, height: 30 });
    const rock = result.current.vibeCategories.find((c: any) => c.id === 'c3');
    expect(rock?.iconLayout).toBeNull();
  });

  it('resolves host names via host_names, publicHosts, and no-match', async () => {
    const { result } = renderHook(() => useHomeData(baseParams), {
      wrapper: wrapperWith([homeDataMock('loc1', 'zoneA'), headerMock, followedClubsMock, followedUsersMock]),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const { hostNameOf } = result.current;
    // host_names array joined
    expect(hostNameOf({ host_names: ['Alice', 'Bob'] })).toBe('Alice, Bob');
    // resolved from publicHosts map via pod_hosts_id
    expect(hostNameOf({ host_names: [], pod_hosts_id: ['h2'] })).toBe('Host Two');
    // no host_names and no matching id -> null
    expect(hostNameOf({ pod_hosts_id: ['missing'] })).toBeNull();
    expect(hostNameOf({})).toBeNull();
  });

  it('applies super-category, category, price and date filters', async () => {
    const { result } = renderHook(
      () =>
        useHomeData({
          ...baseParams,
          superCategorySlug: 'sports',
          categoryId: 'c1',
          priceFilter: 'PREMIUM',
          dateFilter: 'MONTH',
          sortBy: 'PRICE_DESC',
        }),
      {
        wrapper: wrapperWith([
          homeDataMock('loc1', 'zoneA'),
          headerMock,
          followedClubsMock,
          followedUsersMock,
        ]),
      }
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Only PREMIUM pods within a month under sports/c1 -> p_future10
    const activeIds = result.current.activePods.map((p: any) => p.id);
    expect(activeIds).toEqual(['p_future10']);

    // scoped category chips (super branch) and vibe categories restricted to sports
    const chipIds = result.current.categoryChips.map((c: any) => c.id);
    expect(chipIds).not.toContain('c3');
    const vibeIds = result.current.vibeCategories.map((c: any) => c.id);
    expect(vibeIds).not.toContain('c3');
  });

  it('covers FREE/PAID price filters and week/today date filters across renders', async () => {
    const { result: freeRes } = renderHook(
      () => useHomeData({ ...baseParams, priceFilter: 'FREE', dateFilter: 'WEEK', sortBy: 'DATE_DESC' }),
      {
        wrapper: wrapperWith([homeDataMock('loc1', 'zoneA'), headerMock, followedClubsMock, followedUsersMock]),
      }
    );
    await waitFor(() => expect(freeRes.current.loading).toBe(false));
    expect(freeRes.current.activePods.map((p: any) => p.id)).toEqual(['p_future3']);

    const { result: paidRes } = renderHook(
      () => useHomeData({ ...baseParams, priceFilter: 'PAID', dateFilter: 'TOMORROW', sortBy: 'PRICE_ASC' }),
      {
        wrapper: wrapperWith([homeDataMock('loc1', 'zoneA'), headerMock, followedClubsMock, followedUsersMock]),
      }
    );
    await waitFor(() => expect(paidRes.current.loading).toBe(false));
    // TOMORROW window: none of the paid pods fall exactly tomorrow -> empty
    expect(paidRes.current.activePods).toEqual([]);
  });

  it('re-fetches the feed when the home-refresh event fires', async () => {
    const { result } = renderHook(() => useHomeData(baseParams), {
      wrapper: wrapperWith([
        homeDataMock('loc1', 'zoneA'),
        headerMock,
        followedClubsMock,
        followedUsersMock,
        // second copy consumed by refetch
        homeDataMock('loc1', 'zoneA'),
      ]),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      globalThis.dispatchEvent(new Event(HOME_REFRESH_EVENT));
    });

    // still functional after refetch
    await waitFor(() => expect(result.current.totalPods).toBeGreaterThan(0));
  });
});
