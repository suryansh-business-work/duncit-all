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
  it('renders tabs and selects one', () => {
    const select = jest.fn();
    mockedSuper.mockReturnValue({
      superCats: [{ id: 's1', slug: 'music', name: 'Music', icon: '🎵' }],
      selectedSlug: 'music',
      select,
      isLoading: false,
    });
    renderWithProviders(<SuperCategoryTabs />);
    expect(screen.getByTestId('super-cat-all')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('super-cat-all'));
    expect(select).toHaveBeenCalledWith('');
  });

  it('renders a skeleton (no tabs) while loading', () => {
    mockedSuper.mockReturnValue({
      superCats: [],
      selectedSlug: '',
      select: jest.fn(),
      isLoading: true,
    });
    renderWithProviders(<SuperCategoryTabs />);
    expect(screen.queryByTestId('super-cat-all')).toBeNull();
  });
});
