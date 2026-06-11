import { renderHook } from '@testing-library/react-native';

import { useSuperCategories } from '@/hooks/useSuperCategories';

const mockSuperState = {
  data: { categories: [{ id: 's1', slug: 'music', name: 'Music', icon: null }] },
  isLoading: false,
  selectedSlug: 'music',
  select: jest.fn(),
  fetch: jest.fn(),
};
jest.mock('@/stores/super-category.store', () => ({
  useSuperCategoryStore: (selector: (s: unknown) => unknown) => selector(mockSuperState),
}));

describe('useSuperCategories', () => {
  beforeEach(() => {
    mockSuperState.select.mockClear();
    mockSuperState.selectedSlug = 'music';
  });

  it('derives the selected super id from the slug', () => {
    const { result } = renderHook(() => useSuperCategories());
    expect(result.current.superCats).toHaveLength(1);
    expect(result.current.selectedSuperId).toBe('s1');
    expect(mockSuperState.select).not.toHaveBeenCalled();
  });

  it('auto-selects the first category when nothing is selected (no All tab)', () => {
    mockSuperState.selectedSlug = '';
    renderHook(() => useSuperCategories());
    expect(mockSuperState.select).toHaveBeenCalledWith('music');
  });
});
