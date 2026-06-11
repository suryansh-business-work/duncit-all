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
  it('derives the selected super id from the slug', () => {
    const { result } = renderHook(() => useSuperCategories());
    expect(result.current.superCats).toHaveLength(1);
    expect(result.current.selectedSuperId).toBe('s1');
  });
});
