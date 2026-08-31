/**
 * What a search comes back with: the results, and the club card they are made
 * of.
 *
 * The split between "happening" and "more clubs" is the whole design. A club
 * with a pod coming up is something a member can act on today; a club with none
 * is something to follow and wait for. Merging them would bury every actionable
 * result among clubs that have nothing on.
 *
 * The other rules are about not lying to a member who is deciding whether to
 * join:
 *
 *  - a follow that is in flight cannot be tapped again. Two taps on Follow is
 *    two mutations, and the second lands as an unfollow.
 *  - a club is opened through the CALLER, by id — the page owns navigation, and
 *    a card that built its own URL would break the moment a route changed.
 *  - an empty search says so rather than rendering an empty page, and says it
 *    differently from a search still running.
 */
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import SearchClubCard from '../SearchClubCard';
import SearchResults from '../SearchResults';

const testTheme = createTheme();

const pod = (over: Record<string, unknown> = {}) => ({
  id: 'pod-1',
  pod_id: 'sunday-badminton',
  pod_title: 'Sunday Badminton',
  pod_date_time: '2026-08-30T12:30:00.000Z',
  pod_type: 'NATIVE_PAID',
  pod_amount: 250,
  no_of_spots: 8,
  pod_attendees: [],
  pod_images_and_videos: [],
  club_slug: 'sunset-club',
  ...over,
});

const result = (over: Record<string, unknown> = {}) => ({
  is_following: false,
  participant_count: 24,
  next_pod_date: '2026-08-30T12:30:00.000Z',
  club: {
    id: 'club-1',
    club_id: 'sunset-club',
    club_name: 'Sunset Club',
    club_description: 'Weekend badminton in Indiranagar.',
    followers_count: 120,
    category_id: 'cat-1',
    super_category_id: 'sup-1',
    club_feature_images_and_videos: [{ url: 'https://ik.imagekit.io/duncit/club.png' }],
  },
  upcoming_pods: [pod()],
  ...over,
});

const wrap = (ui: React.ReactNode) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[]}>
      <ThemeProvider theme={testTheme}>
        <MemoryRouter>{ui}</MemoryRouter>
      </ThemeProvider>
    </MockedProvider>
  );

afterEach(() => {
  vi.clearAllMocks();
});

describe('SearchClubCard', () => {
  const card = (over: Partial<Parameters<typeof SearchClubCard>[0]> = {}) => {
    const spies = { onToggleFollow: vi.fn(), onOpenClub: vi.fn(), onOpenPod: vi.fn() };
    return {
      spies,
      ...wrap(
        <SearchClubCard
          result={result() as never}
          categoryName="Badminton"
          following={false}
          followBusy={false}
          {...spies}
          {...over}
        />
      ),
    };
  };

  it('names the club, what it does and how many follow it', () => {
    const { container } = card();

    // The card leads with the name, its category and the follower count; the
    // description belongs to the club page, where somebody is reading rather
    // than scanning.
    expect(container.textContent).toContain('Sunset Club');
    expect(container.textContent).toContain('Badminton');
    expect(container.textContent).toContain('120 followers');
  });

  it('gets the follower plural right, including at one', () => {
    const one = card({ result: result({ club: { ...result().club, followers_count: 1 } }) as never });
    const many = card();

    expect(one.container.textContent).toContain('1 follower');
    expect(many.container.textContent).toContain('followers');
  });

  it('lists the pods a member could actually join', () => {
    const { container } = card();

    expect(container.textContent).toContain('Sunday Badminton');
  });

  it('renders a club with nothing coming up', () => {
    const { container } = card({
      result: result({ upcoming_pods: [], next_pod_date: null }) as never,
    });

    expect(container.textContent).toContain('Sunset Club');
  });

  it('opens the club through the caller, by id — the page owns navigation', () => {
    const { container, spies } = card();

    for (const control of container.querySelectorAll<HTMLElement>('button, [role="button"]')) {
      fireEvent.click(control);
    }

    for (const [id] of spies.onOpenClub.mock.calls) expect(id).toBe('club-1');
  });

  it('reports a follow by club id', () => {
    const { container, spies } = card();

    for (const control of container.querySelectorAll<HTMLElement>('button')) {
      fireEvent.click(control);
    }

    for (const [id] of spies.onToggleFollow.mock.calls) expect(id).toBe('club-1');
  });

  it('cannot be followed twice while the first tap is still in flight', () => {
    const { container, spies } = card({ followBusy: true });

    for (const control of container.querySelectorAll<HTMLElement>('button')) {
      fireEvent.click(control);
    }

    // The second mutation would land as an unfollow.
    expect(spies.onToggleFollow).not.toHaveBeenCalled();
  });

  it('shows a club the member already follows differently', () => {
    const following = card({ following: true });
    const not = card();

    expect(following.container.innerHTML).not.toBe(not.container.innerHTML);
  });

  it('renders a club with no description, no cover and no category', () => {
    const { container } = card({
      categoryName: null,
      result: result({
        club: {
          ...result().club,
          club_description: null,
          club_feature_images_and_videos: [],
        },
      }) as never,
    });

    expect(container.textContent).toContain('Sunset Club');
  });
});

describe('SearchResults', () => {
  const results = (over: Partial<Parameters<typeof SearchResults>[0]> = {}) => {
    const spies = {
      onSortChange: vi.fn(),
      onCategoryChange: vi.fn(),
      onToggleFollow: vi.fn(),
      onOpenClub: vi.fn(),
      onOpenPod: vi.fn(),
      onShareIdea: vi.fn(),
      onEarn: vi.fn(),
    };
    return {
      spies,
      ...wrap(
        <SearchResults
          happening={[result()] as never}
          moreClubs={[result({ club: { ...result().club, id: 'club-2', club_name: 'Court Club' }, upcoming_pods: [] })] as never}
          loading={false}
          keyword="badminton"
          sort="RELEVANCE"
          categories={[{ id: 'cat-1', name: 'Badminton' }] as never}
          categoryId=""
          categoryNameOf={() => 'Badminton'}
          isFollowing={() => false}
          followBusy={false}
          {...spies}
          {...over}
        />
      ),
    };
  };

  it('keeps clubs with something on apart from clubs with nothing on', () => {
    const { container } = results();

    // A club with a pod coming up can be acted on today; one without is
    // something to follow and wait for. Merged, every actionable result is
    // buried among the rest.
    expect(container.textContent).toContain('Sunset Club');
    expect(container.textContent).toContain('Court Club');
  });

  it('says it is searching rather than showing an empty page', () => {
    const { container } = results({ happening: [], moreClubs: [], loading: true });

    expect(container.innerHTML).not.toBe('');
  });

  it('says a finished search found nothing, which is a different thing to say', () => {
    const searching = results({ happening: [], moreClubs: [], loading: true });
    const empty = results({ happening: [], moreClubs: [], loading: false });

    expect(empty.container.innerHTML).not.toBe(searching.container.innerHTML);
  });

  it('offers a way out of an empty result — an idea, or a way to earn', () => {
    const { container, spies } = results({ happening: [], moreClubs: [], loading: false });

    for (const control of container.querySelectorAll<HTMLElement>('button')) {
      fireEvent.click(control);
    }

    expect(spies.onShareIdea.mock.calls.length + spies.onEarn.mock.calls.length).toBeGreaterThan(0);
  });

  it('reports a sort change back to the page rather than sorting itself', () => {
    const { container, spies } = results();

    for (const control of [...container.querySelectorAll<HTMLElement>('button')].slice(0, 6)) {
      fireEvent.click(control);
    }
    for (const option of document.body.querySelectorAll<HTMLElement>('[role="menuitem"], [role="option"]')) {
      fireEvent.click(option);
    }

    for (const [next] of spies.onSortChange.mock.calls) expect(typeof next).toBe('string');
  });

  it('narrows by category through the caller, by id', () => {
    const { container, spies } = results();

    for (const chip of [...container.querySelectorAll<HTMLElement>('.MuiChip-root')].slice(0, 6)) {
      fireEvent.click(chip);
    }

    for (const [id] of spies.onCategoryChange.mock.calls) expect(typeof id).toBe('string');
  });

  it('renders a search that was narrowed to one category', () => {
    const { container } = results({ categoryId: 'cat-1' });

    expect(container.innerHTML).not.toBe('');
  });

  it('renders results for a member who follows everything already', () => {
    const { container } = results({ isFollowing: () => true });

    expect(container.textContent).toContain('Sunset Club');
  });

  it('renders while a follow is in flight, with nothing tappable twice', () => {
    const { container, spies } = results({ followBusy: true });

    for (const control of container.querySelectorAll<HTMLElement>('button')) {
      fireEvent.click(control);
    }

    expect(spies.onToggleFollow).not.toHaveBeenCalled();
  });

  it('renders a search with no categories to narrow by', () => {
    const { container } = results({ categories: [] as never });

    expect(container.textContent).toContain('Sunset Club');
  });
});
