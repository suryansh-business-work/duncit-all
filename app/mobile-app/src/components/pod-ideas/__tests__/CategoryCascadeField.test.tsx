import { useState } from 'react';
import { fireEvent, screen } from '@testing-library/react-native';

import {
  CategoryCascadeField,
  EMPTY_CATEGORY_SCOPE,
  type CategoryLabels,
  type CategoryScope,
} from '@/components/pod-ideas/CategoryCascadeField';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useCategoryLevel', () => ({
  useCategoryLevel: (level: string, parentId: string, enabled: boolean) => {
    if (!enabled) return [];
    if (level === 'SUPER') return [{ id: 's1', name: 'For You', level, parent_id: null }];
    if (level === 'CATEGORY') return [{ id: 'c1', name: 'Sports', level, parent_id: parentId }];
    return [{ id: 'b1', name: 'Badminton', level, parent_id: parentId }];
  },
}));

function Harness({
  allowAll,
  onChangeSpy,
}: Readonly<{ allowAll?: boolean; onChangeSpy: (s: CategoryScope, l: CategoryLabels) => void }>) {
  const [scope, setScope] = useState<CategoryScope>(EMPTY_CATEGORY_SCOPE);
  return (
    <CategoryCascadeField
      value={scope}
      allowAll={allowAll}
      onChange={(s, l) => {
        setScope(s);
        onChangeSpy(s, l);
      }}
    />
  );
}

describe('CategoryCascadeField', () => {
  it('cascades Super → Category → Sub and resolves the labels', () => {
    const spy = jest.fn();
    renderWithProviders(<Harness onChangeSpy={spy} />);
    // Only the Super group shows until a super is chosen.
    expect(screen.queryByTestId('idea-cat-category_id-c1')).toBeNull();

    fireEvent.press(screen.getByTestId('idea-cat-super_category_id-s1'));
    expect(spy).toHaveBeenLastCalledWith(
      { super_category_id: 's1', category_id: '', sub_category_id: '' },
      expect.objectContaining({ super_category_name: 'For You' }),
    );

    fireEvent.press(screen.getByTestId('idea-cat-category_id-c1'));
    fireEvent.press(screen.getByTestId('idea-cat-sub_category_id-b1'));
    expect(spy).toHaveBeenLastCalledWith(
      { super_category_id: 's1', category_id: 'c1', sub_category_id: 'b1' },
      {
        super_category_name: 'For You',
        category_name: 'Sports',
        sub_category_name: 'Badminton',
      },
    );
  });

  it('resets children when a parent changes', () => {
    const spy = jest.fn();
    renderWithProviders(<Harness onChangeSpy={spy} />);
    fireEvent.press(screen.getByTestId('idea-cat-super_category_id-s1'));
    fireEvent.press(screen.getByTestId('idea-cat-category_id-c1'));
    // Re-pick the same super — category/sub clear.
    fireEvent.press(screen.getByTestId('idea-cat-super_category_id-s1'));
    expect(spy).toHaveBeenLastCalledWith(
      { super_category_id: 's1', category_id: '', sub_category_id: '' },
      expect.anything(),
    );
  });

  it('offers an "All" chip that clears a level in filter mode', () => {
    const spy = jest.fn();
    renderWithProviders(<Harness allowAll onChangeSpy={spy} />);
    fireEvent.press(screen.getByTestId('idea-cat-super_category_id-s1'));
    fireEvent.press(screen.getByTestId('idea-cat-category_id-c1'));
    // "All" at super clears the whole scope.
    fireEvent.press(screen.getByTestId('idea-cat-super_category_id-all'));
    expect(spy).toHaveBeenLastCalledWith(
      { super_category_id: '', category_id: '', sub_category_id: '' },
      expect.anything(),
    );
  });
});
