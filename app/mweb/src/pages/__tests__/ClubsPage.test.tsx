import '@testing-library/jest-dom/vitest';
import type { ReactElement } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

const navigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
}));

import ClubsPage, { ALL_CLUBS } from '../ClubsPage';
import { ACTIVE_ADS } from '../../components/ads/useActiveAds';
import { SEARCH_CATEGORIES } from '../search-page/queries';
import { OPEN_LOCATION_PICKER_EVENT } from '../../components/app-header/queries';

const club = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  club_id: `pub-${id}`,
  club_name: `Club ${id}`,
  club_description: `Desc ${id}`,
  category_id: 'cat-a',
  super_category_id: 's1',
  club_feature_images_and_videos: [],
  ...over,
});

const categoriesData = [
  { id: 'cat-a', name: 'Badminton', slug: 'badminton', icon: null, level: 'CATEGORY', parent_id: 's1' },
  { id: 'cat-b', name: 'Tennis', slug: 'tennis', icon: null, level: 'CATEGORY', parent_id: 's1' },
];

const catMock = {
  request: { query: SEARCH_CATEGORIES },
  result: { data: { categories: categoriesData } },
};

const adMock = (ads: unknown[] = []) => ({
  request: { query: ACTIVE_ADS, variables: { position: 'CLUB_LIST' } },
  result: { data: { activeAds: ads } },
});

const allClubsMock = (
  vars: { locationId: string | undefined; locality: string | undefined },
  clubs: unknown[],
  pods: unknown[] = [],
) => ({
  request: { query: ALL_CLUBS, variables: vars },
  result: {
    data: {
      superCategories: [{ id: 's1', slug: 'sports' }],
      locations: [{ id: 'loc-1', location_name: 'Pune' }],
      clubs,
      pods,
    },
  },
});

const noVars = { locationId: undefined, locality: undefined };

const setup = (mocks: unknown[], ui: ReactElement) =>
  render(
    <MockedProvider mocks={mocks as never} addTypename={false}>
      {ui}
    </MockedProvider>,
  );

afterEach(() => {
  vi.clearAllMocks();
});

describe('ClubsPage', () => {
  it('shows the loading spinner before data resolves', () => {
    setup([allClubsMock(noVars, []), catMock, adMock()], <ClubsPage />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders the header, clubs and pod counts', async () => {
    setup(
      [
        allClubsMock(noVars, [club('1'), club('2')], [
          { id: 'p1', club_id: '1' },
          { id: 'p2', club_id: '1' },
        ]),
        catMock,
        adMock(),
      ],
      <ClubsPage />,
    );
    expect(await screen.findByText('Club 1')).toBeInTheDocument();
    expect(screen.getByText('Club 2')).toBeInTheDocument();
    // sorted + pod count chip: Club 1 has 2 pods, Club 2 has 0
    expect(screen.getByText('2 pods')).toBeInTheDocument();
    expect(screen.getByText('0 pods')).toBeInTheDocument();
    expect(screen.getByText('Clubs')).toBeInTheDocument();
  });

  it('renders category chips and filters by a selected chip', async () => {
    setup(
      [
        allClubsMock(noVars, [
          club('1', { category_id: 'cat-a' }),
          club('2', { category_id: 'cat-b', club_name: 'Club 2' }),
        ]),
        catMock,
        adMock(),
      ],
      <ClubsPage />,
    );
    expect(await screen.findByText('Club 1')).toBeInTheDocument();
    // Badminton chip appears (category-level)
    fireEvent.click(screen.getByText('Badminton'));
    await waitFor(() => expect(screen.queryByText('Club 2')).not.toBeInTheDocument());
    expect(screen.getByText('Club 1')).toBeInTheDocument();
  });

  it('filters clubs by the search input and shows the empty state', async () => {
    setup(
      [allClubsMock(noVars, [club('1'), club('2')]), catMock, adMock()],
      <ClubsPage />,
    );
    await screen.findByText('Club 1');
    fireEvent.change(screen.getByPlaceholderText('Search clubs'), {
      target: { value: 'zzz-no-match' },
    });
    expect(await screen.findByText('No clubs found.')).toBeInTheDocument();
  });

  it('navigates to the club detail on open', async () => {
    setup([allClubsMock(noVars, [club('9')]), catMock, adMock()], <ClubsPage />);
    fireEvent.click(await screen.findByText('Open Club'));
    expect(navigate).toHaveBeenCalledWith('/club/pub-9');
  });

  it('shows the error alert when the query fails', async () => {
    setup(
      [
        { request: { query: ALL_CLUBS, variables: noVars }, error: new Error('boom') },
        catMock,
        adMock(),
      ],
      <ClubsPage />,
    );
    expect(await screen.findByText('boom')).toBeInTheDocument();
  });

  it('shows the location note with zone and dispatches the picker event via the link', async () => {
    const dispatchSpy = vi.spyOn(globalThis, 'dispatchEvent');
    setup(
      [
        allClubsMock({ locationId: 'loc-1', locality: 'Baner' }, [club('1')]),
        catMock,
        adMock(),
      ],
      <ClubsPage locationId="loc-1" zoneName="Baner" />,
    );
    expect(await screen.findByText('Pune · Baner')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Change your location here'));
    expect(
      dispatchSpy.mock.calls.some(([e]) => (e as CustomEvent).type === OPEN_LOCATION_PICKER_EVENT),
    ).toBe(true);
    dispatchSpy.mockRestore();
  });

  it('shows the no-clubs-at-location state and resets on button tap', async () => {
    const dispatchSpy = vi.spyOn(globalThis, 'dispatchEvent');
    setup(
      [allClubsMock({ locationId: 'loc-1', locality: undefined }, []), catMock, adMock()],
      <ClubsPage locationId="loc-1" />,
    );
    expect(
      await screen.findByText('No Clubs operating at the selected location,'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reset Location' }));
    expect(
      dispatchSpy.mock.calls.some(([e]) => (e as CustomEvent).type === OPEN_LOCATION_PICKER_EVENT),
    ).toBe(true);
    dispatchSpy.mockRestore();
  });

  it('scopes category chips to the header super category', async () => {
    setup(
      [allClubsMock(noVars, [club('1')]), catMock, adMock()],
      <ClubsPage superCategorySlug="sports" />,
    );
    // super slug 'sports' -> s1; both cat-a/cat-b are under s1
    expect(await screen.findByText('Club 1')).toBeInTheDocument();
    expect(screen.getByText('Badminton')).toBeInTheDocument();
    expect(screen.getByText('Tennis')).toBeInTheDocument();
  });
});
