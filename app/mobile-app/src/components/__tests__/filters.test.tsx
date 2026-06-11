import { fireEvent, screen } from '@testing-library/react-native';

import { SuperCategoryTabs } from '@/components/SuperCategoryTabs';
import { useSuperCategories } from '@/hooks/useSuperCategories';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useSuperCategories');

const mockedSuper = useSuperCategories as jest.Mock;

beforeEach(() => {
  mockedSuper.mockReturnValue({
    superCats: [{ id: 's1', slug: 'music', name: 'Music', icon: '🎵' }],
    selectedSlug: '',
    select: jest.fn(),
    isLoading: false,
  });
});

describe('SuperCategoryTabs', () => {
  it('renders the selected tab with its icon and selects another (no All tab)', () => {
    const select = jest.fn();
    mockedSuper.mockReturnValue({
      superCats: [
        { id: 's1', slug: 'music', name: 'Music', icon: '🎵' },
        { id: 's2', slug: 'food', name: 'Food', icon: null },
      ],
      selectedSlug: 'music',
      select,
      isLoading: false,
    });
    renderWithProviders(<SuperCategoryTabs />);
    expect(screen.queryByTestId('super-cat-all')).toBeNull();
    expect(screen.getByTestId('super-cat-music')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('super-cat-food'));
    expect(select).toHaveBeenCalledWith('food');
  });

  it('lays the category tabs out full width', () => {
    mockedSuper.mockReturnValue({
      superCats: [
        { id: 's1', slug: 'for-you', name: 'For You', icon: null },
        { id: 's2', slug: 'for-your-pet', name: 'For Your Pet', icon: null },
      ],
      selectedSlug: 'for-you',
      select: jest.fn(),
      isLoading: false,
    });
    renderWithProviders(<SuperCategoryTabs />);
    expect(screen.getByTestId('super-cat-tabs')).toBeOnTheScreen();
    expect(screen.getByTestId('super-cat-for-you')).toBeOnTheScreen();
    expect(screen.getByText('For Your Pet')).toBeOnTheScreen();
  });

  it('renders a skeleton (no tabs) while loading and nothing when empty', () => {
    mockedSuper.mockReturnValue({
      superCats: [],
      selectedSlug: '',
      select: jest.fn(),
      isLoading: true,
    });
    const { rerender } = renderWithProviders(<SuperCategoryTabs />);
    expect(screen.queryByTestId('super-cat-tabs')).toBeNull();

    mockedSuper.mockReturnValue({
      superCats: [],
      selectedSlug: '',
      select: jest.fn(),
      isLoading: false,
    });
    rerender(<SuperCategoryTabs />);
    expect(screen.queryByTestId('super-cat-tabs')).toBeNull();
  });
});
