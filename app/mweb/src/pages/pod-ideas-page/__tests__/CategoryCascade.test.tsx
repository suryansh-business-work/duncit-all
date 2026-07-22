import { describe, expect, it, vi } from 'vitest';
import { MockedProvider } from '@apollo/client/testing';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CategoryCascade, { EMPTY_CATEGORY_SCOPE, type CategoryScope } from '../CategoryCascade';
import { CATEGORIES, type CategoryOption } from '../../survey-gate/queries';

const cat = (over: Partial<CategoryOption>): CategoryOption => ({
  id: 'x',
  name: 'X',
  level: 'SUPER',
  parent_id: null,
  is_active: true,
  sort_order: 0,
  ...over,
});

const supers: CategoryOption[] = [
  cat({ id: 's2', name: 'Music', level: 'SUPER', sort_order: 2 }),
  cat({ id: 's1', name: 'Sports', level: 'SUPER', sort_order: 1 }),
  cat({ id: 's3', name: 'Hidden', level: 'SUPER', sort_order: 3, is_active: false }),
];
const categories: CategoryOption[] = [
  cat({ id: 'c1', name: 'Football', level: 'CATEGORY', parent_id: 's1', sort_order: 1 }),
  cat({ id: 'c2', name: 'Cricket', level: 'CATEGORY', parent_id: 's1', sort_order: 2 }),
];
const subs: CategoryOption[] = [
  cat({ id: 'sub1', name: 'Five-a-side', level: 'SUB', parent_id: 'c1', sort_order: 1 }),
];

const superMock = {
  request: { query: CATEGORIES, variables: { level: 'SUPER', parent_id: null } },
  result: { data: { categories: supers } },
};
const catMock = {
  request: { query: CATEGORIES, variables: { level: 'CATEGORY', parent_id: 's1' } },
  result: { data: { categories } },
};
const subMock = {
  request: { query: CATEGORIES, variables: { level: 'SUB', parent_id: 'c1' } },
  result: { data: { categories: subs } },
};

const renderCascade = (
  value: CategoryScope,
  onChange: (s: CategoryScope, l: unknown) => void,
  props: { allowAll?: boolean } = {},
  mocks = [superMock, catMock, subMock],
) =>
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <CategoryCascade value={value} onChange={onChange} allowAll={props.allowAll} />
    </MockedProvider>,
  );

const openAndPick = (labelText: string, optionText: string) => {
  const input = screen.getByLabelText(labelText);
  fireEvent.keyDown(input, { key: 'ArrowDown' });
  fireEvent.click(screen.getByText(optionText));
};

describe('CategoryCascade', () => {
  it('renders three required (*) fields; loads and sorts active supers only', async () => {
    renderCascade(EMPTY_CATEGORY_SCOPE, vi.fn());
    expect(screen.getByLabelText('Super Category *')).toBeInTheDocument();
    expect(screen.getByLabelText('Category *')).toBeInTheDocument();
    expect(screen.getByLabelText('Sub Category *')).toBeInTheDocument();

    fireEvent.keyDown(screen.getByLabelText('Super Category *'), { key: 'ArrowDown' });
    await waitFor(() => expect(screen.getByText('Sports')).toBeInTheDocument());
    const options = screen.getAllByRole('option').map((o) => o.textContent);
    // sort_order 1 (Sports) before 2 (Music); inactive 'Hidden' filtered out
    expect(options).toEqual(['Sports', 'Music']);
  });

  it('drops the required markers in allowAll (filter) mode', () => {
    renderCascade(EMPTY_CATEGORY_SCOPE, vi.fn(), { allowAll: true });
    expect(screen.getByLabelText('Super Category')).toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toBeInTheDocument();
    expect(screen.getByLabelText('Sub Category')).toBeInTheDocument();
  });

  it('disables Category and Sub until their parent is chosen', () => {
    renderCascade(EMPTY_CATEGORY_SCOPE, vi.fn());
    expect(screen.getByLabelText('Category *')).toBeDisabled();
    expect(screen.getByLabelText('Sub Category *')).toBeDisabled();
  });

  it('picking a super emits its id scope + name and resets lower levels', async () => {
    const onChange = vi.fn();
    renderCascade(EMPTY_CATEGORY_SCOPE, onChange);
    await waitFor(() => screen.getByLabelText('Super Category *'));
    openAndPick('Super Category *', 'Sports');
    expect(onChange).toHaveBeenCalledWith(
      { super_category_id: 's1', category_id: '', sub_category_id: '' },
      expect.objectContaining({ super_category_name: 'Sports' }),
    );
  });

  it('picking category and sub emits merged scope with resolved names', async () => {
    const onChange = vi.fn();
    const value: CategoryScope = { super_category_id: 's1', category_id: 'c1', sub_category_id: '' };
    renderCascade(value, onChange);

    // Category enabled because super is set; sub enabled because category is set
    await waitFor(() => expect(screen.getByLabelText('Category *')).not.toBeDisabled());
    expect(screen.getByLabelText('Sub Category *')).not.toBeDisabled();

    openAndPick('Category *', 'Cricket');
    expect(onChange).toHaveBeenLastCalledWith(
      { super_category_id: 's1', category_id: 'c2', sub_category_id: '' },
      expect.objectContaining({ category_name: 'Cricket' }),
    );

    openAndPick('Sub Category *', 'Five-a-side');
    expect(onChange).toHaveBeenLastCalledWith(
      { super_category_id: 's1', category_id: 'c1', sub_category_id: 'sub1' },
      expect.objectContaining({ sub_category_name: 'Five-a-side' }),
    );
  });

  it('clearing a field emits an empty id for that level', async () => {
    const onChange = vi.fn();
    const value: CategoryScope = { super_category_id: 's1', category_id: '', sub_category_id: '' };
    renderCascade(value, onChange);
    await waitFor(() => screen.getByLabelText('Super Category *'));

    // The clear (X) indicator resolves onChange's `v ?? ''` null branch to ''
    fireEvent.click(screen.getByTitle('Clear'));
    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith(
        { super_category_id: '', category_id: '', sub_category_id: '' },
        expect.anything(),
      ),
    );
  });
});
