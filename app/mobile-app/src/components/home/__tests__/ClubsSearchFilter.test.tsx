import { fireEvent, screen } from '@testing-library/react-native';

import { ClubsSearchFilter } from '@/components/home/ClubsSearchFilter';
import type { CategoryOption } from '@/hooks/useClubsFilter';
import { renderWithProviders } from '@/utils/test-utils';

const categoryOptions: CategoryOption[] = [
  ['cat1', 'Sports'],
  ['cat2', 'Arts'],
];

describe('ClubsSearchFilter', () => {
  it('fires query changes and category selection', () => {
    const onQueryChange = jest.fn();
    const onCategoryChange = jest.fn();
    renderWithProviders(
      <ClubsSearchFilter
        query=""
        onQueryChange={onQueryChange}
        categoryId=""
        categoryOptions={categoryOptions}
        onCategoryChange={onCategoryChange}
      />,
    );
    fireEvent.changeText(screen.getByTestId('clubs-search-input'), 'run');
    expect(onQueryChange).toHaveBeenCalledWith('run');
    // The leading "All" chip clears the filter.
    fireEvent.press(screen.getByTestId('clubs-filter-cat-all'));
    expect(onCategoryChange).toHaveBeenCalledWith('');
    fireEvent.press(screen.getByTestId('clubs-filter-cat-cat1'));
    expect(onCategoryChange).toHaveBeenCalledWith('cat1');
  });

  it('hides the category rail when there are no category options', () => {
    renderWithProviders(
      <ClubsSearchFilter
        query="jazz"
        onQueryChange={jest.fn()}
        categoryId=""
        categoryOptions={[]}
        onCategoryChange={jest.fn()}
      />,
    );
    expect(screen.getByTestId('clubs-search-input')).toBeOnTheScreen();
    expect(screen.queryByTestId('clubs-filter-cat-all')).toBeNull();
  });
});
