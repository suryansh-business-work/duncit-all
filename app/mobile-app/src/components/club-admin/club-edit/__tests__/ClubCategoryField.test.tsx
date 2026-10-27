import { fireEvent, screen } from '@testing-library/react-native';

import { CategoryLevel } from '@/generated/graphql/graphql';
import { renderWithProviders } from '@/utils/test-utils';
import { ClubCategoryField } from '../ClubCategoryField';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});
const mockCategories = [
  { id: 's1', name: 'Sports', level: CategoryLevel.Super, parent_id: null, sort_order: 1 },
  { id: 's2', name: 'Wellness', level: CategoryLevel.Super, parent_id: null, sort_order: 2 },
  { id: 'c1', name: 'Racquet', level: CategoryLevel.Category, parent_id: 's1', sort_order: 1 },
  { id: 'c2', name: 'Team', level: CategoryLevel.Category, parent_id: 's1', sort_order: 2 },
  { id: 'u1', name: 'Badminton', level: CategoryLevel.Sub, parent_id: 'c1', sort_order: 1 },
  { id: 'u2', name: 'Football', level: CategoryLevel.Sub, parent_id: 'c2', sort_order: 1 },
];
jest.mock('@/hooks/useCategoryTree', () => ({
  useCategoryTree: () => ({ categories: mockCategories }),
}));

const mount = (
  superId: string,
  subId: string,
  extra: { superError?: string; subError?: string } = {},
) => {
  const onChange = jest.fn();
  const view = renderWithProviders(
    <ClubCategoryField superId={superId} subId={subId} onChange={onChange} {...extra} />,
  );
  const rerender = (nextSuper: string, nextSub: string) =>
    view.rerender(<ClubCategoryField superId={nextSuper} subId={nextSub} onChange={onChange} />);
  return { onChange, rerender };
};

const chip = (level: string, id: string) => screen.getByTestId(`club-edit-${level}-category-${id}`);

describe('ClubCategoryField', () => {
  it('shows the hint and the super categories', () => {
    mount('', '');
    expect(screen.getByTestId('club-edit-category-hint')).toHaveTextContent(
      'clubForm.basicSection.categoryHint',
    );
    expect(chip('super', 's1')).toBeOnTheScreen();
    expect(chip('super', 's2')).toBeOnTheScreen();
  });

  it('asks for a super first: no middle or sub choices yet', () => {
    mount('', '');
    expect(screen.getByTestId('club-edit-middle-category-empty')).toHaveTextContent(
      'clubForm.basicSection.superFirst',
    );
    expect(screen.getByTestId('club-edit-sub-category-empty')).toHaveTextContent(
      'clubForm.basicSection.superFirst',
    );
  });

  it('marks the saved super and sub, and derives the middle level from the sub', () => {
    mount('s1', 'u1');
    expect(chip('super', 's1').props['aria-checked']).toBe(true);
    expect(chip('middle', 'c1').props['aria-checked']).toBe(true);
    expect(chip('middle', 'c2').props['aria-checked']).toBe(false);
    expect(chip('sub', 'u1').props['aria-checked']).toBe(true);
    expect(screen.queryByTestId('club-edit-sub-category-u2')).toBeNull();
  });

  it('moves to another super, clearing the sub that cannot survive the move', () => {
    const { onChange } = mount('s1', 'u1');
    fireEvent.press(chip('super', 's2'));
    expect(onChange).toHaveBeenCalledWith('s2', '');
  });

  it('picking a middle category clears the sub and shows only that middle subs', () => {
    const { onChange, rerender } = mount('s1', '');
    fireEvent.press(chip('middle', 'c2'));
    expect(onChange).toHaveBeenCalledWith('s1', '');
    rerender('s1', '');
    expect(chip('middle', 'c2').props['aria-checked']).toBe(true);
    expect(chip('sub', 'u2')).toBeOnTheScreen();
    expect(screen.queryByTestId('club-edit-sub-category-u1')).toBeNull();
  });

  it('lists every sub under the super while no middle is chosen', () => {
    mount('s1', '');
    expect(chip('sub', 'u1')).toBeOnTheScreen();
    expect(chip('sub', 'u2')).toBeOnTheScreen();
  });

  it('forgets a drafted middle when the super changes', () => {
    const { rerender } = mount('s1', '');
    fireEvent.press(chip('middle', 'c2'));
    rerender('s1', '');
    expect(chip('middle', 'c2').props['aria-checked']).toBe(true);
    rerender('s2', '');
    expect(screen.queryByTestId('club-edit-middle-category-c2')).toBeNull();
  });

  it('picks a sub under the current super', () => {
    const { onChange } = mount('s1', '');
    fireEvent.press(chip('sub', 'u2'));
    expect(onChange).toHaveBeenCalledWith('s1', 'u2');
  });

  it('shows the errors of the super and the sub', () => {
    mount('', '', { superError: 'Pick a super', subError: 'Pick a sub' });
    expect(screen.getByText('Pick a super')).toBeOnTheScreen();
    expect(screen.getByText('Pick a sub')).toBeOnTheScreen();
  });
});
