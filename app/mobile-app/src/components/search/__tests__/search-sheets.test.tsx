import { fireEvent, screen } from '@testing-library/react-native';

import { SearchSortSheet } from '@/components/search/SearchSortSheet';
import { SearchFilterSheet } from '@/components/search/SearchFilterSheet';
import { SearchResults } from '@/components/search/SearchResults';
import { useClubFollow } from '@/hooks/useFollow';
import type { SearchCategory, SearchClubResult } from '@/hooks/useSearch';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useFollow', () => ({ useClubFollow: jest.fn() }));
(useClubFollow as jest.Mock).mockReturnValue({ following: false, busy: false, toggle: jest.fn() });

const category = (id: string, name: string) =>
  ({
    id,
    name,
    slug: name.toLowerCase(),
    icon: null,
    level: 'CATEGORY',
    parent_id: null,
  }) as unknown as SearchCategory;

const result = (id: string, over: Record<string, unknown> = {}): SearchClubResult =>
  ({
    is_following: false,
    participant_count: 0,
    next_pod_date: null,
    upcoming_pods: [],
    club: {
      id,
      club_id: `club-${id}`,
      club_name: `Club ${id}`,
      club_description: 'desc',
      followers_count: 1,
      category_id: null,
      super_category_id: null,
      club_feature_images_and_videos: [],
    },
    ...over,
  }) as unknown as SearchClubResult;

describe('SearchSortSheet', () => {
  it('selects a sort option and closes, and closes from the X', () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    renderWithProviders(
      <SearchSortSheet open value="RELEVANCE" onSelect={onSelect} onClose={onClose} />,
    );
    fireEvent.press(screen.getByTestId('search-sort-POPULAR'));
    expect(onSelect).toHaveBeenCalledWith('POPULAR');
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByTestId('search-sort-close'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe('SearchFilterSheet', () => {
  it('selects a category, clears via All, and applies', () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    renderWithProviders(
      <SearchFilterSheet
        open
        categories={[category('c1', 'Sports'), category('c2', 'Music')]}
        categoryId="c1"
        onSelect={onSelect}
        onClose={onClose}
      />,
    );
    fireEvent.press(screen.getByTestId('search-filter-cat-c2'));
    expect(onSelect).toHaveBeenCalledWith('c2');
    fireEvent.press(screen.getByTestId('search-filter-cat-all'));
    expect(onSelect).toHaveBeenCalledWith('');
    fireEvent.press(screen.getByTestId('search-filter-apply'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows a placeholder when there are no categories', () => {
    renderWithProviders(
      <SearchFilterSheet
        open
        categories={[]}
        categoryId=""
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByText('No categories available yet.')).toBeOnTheScreen();
    expect(screen.queryByTestId('search-filter-cat-all')).toBeNull();
  });
});

const baseProps = {
  happening: [] as SearchClubResult[],
  moreClubs: [] as SearchClubResult[],
  loading: false,
  keyword: 'badminton',
  sort: 'RELEVANCE' as const,
  onSortChange: jest.fn(),
  categories: [category('c1', 'Sports')],
  categoryId: '',
  onCategoryChange: jest.fn(),
  categoryNameOf: () => null,
  onOpenClub: jest.fn(),
  onOpenPod: jest.fn(),
  onShareIdea: jest.fn(),
  onEarn: jest.fn(),
};

describe('SearchResults', () => {
  it('renders both sections, sorts via the sheet and filters via the sheet', () => {
    const onSortChange = jest.fn();
    const onCategoryChange = jest.fn();
    renderWithProviders(
      <SearchResults
        {...baseProps}
        happening={[result('1')]}
        moreClubs={[result('2')]}
        onSortChange={onSortChange}
        onCategoryChange={onCategoryChange}
      />,
    );
    expect(screen.getByTestId('search-happening')).toBeOnTheScreen();
    expect(screen.getByTestId('search-more')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('search-sort-button'));
    fireEvent.press(screen.getByTestId('search-sort-POPULAR'));
    expect(onSortChange).toHaveBeenCalledWith('POPULAR');

    fireEvent.press(screen.getByTestId('search-filter-button'));
    fireEvent.press(screen.getByTestId('search-filter-cat-c1'));
    expect(onCategoryChange).toHaveBeenCalledWith('c1');
    fireEvent.press(screen.getByTestId('search-filter-apply'));
  });

  it('shows the loading spinner while empty results are loading', () => {
    renderWithProviders(<SearchResults {...baseProps} loading />);
    expect(screen.getByTestId('search-loading')).toBeOnTheScreen();
  });

  it('shows the no-results empty state when nothing matches a keyword', () => {
    renderWithProviders(<SearchResults {...baseProps} />);
    expect(screen.getByText('No Pods Match Your Search')).toBeOnTheScreen();
  });

  it('shows the empty-category state and highlights the active filter', () => {
    const onCategoryChange = jest.fn();
    renderWithProviders(
      <SearchResults {...baseProps} categoryId="c1" onCategoryChange={onCategoryChange} />,
    );
    expect(screen.getByText('Nothing Here Yet')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('search-cta-explore'));
    expect(onCategoryChange).toHaveBeenCalledWith('');
  });
});
