import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import CategoryStep, { type CategoryScope } from '../CategoryStep';
import { CATEGORIES, type CategoryOption } from '../queries';

const SUPERS: CategoryOption[] = [
  { id: 's1', name: 'Food', level: 'SUPER', parent_id: null, is_active: true, sort_order: 1 },
  { id: 's2', name: 'Apparel', level: 'SUPER', parent_id: null, is_active: true, sort_order: 2 },
];
const CATS_S1: CategoryOption[] = [
  { id: 'c1', name: 'Snacks', level: 'CATEGORY', parent_id: 's1', is_active: true, sort_order: 1 },
];
const SUBS_C1: CategoryOption[] = [
  { id: 'sub1', name: 'Chips', level: 'SUB', parent_id: 'c1', is_active: true, sort_order: 1 },
];

const catMock = (level: string, parentId: string | null, categories: CategoryOption[], times = 2) =>
  Array.from({ length: times }, () => ({
    request: { query: CATEGORIES, variables: { level, parent_id: parentId } },
    result: { data: { categories } },
  }));

const fullMocks = [
  ...catMock('SUPER', null, SUPERS),
  ...catMock('CATEGORY', 's1', CATS_S1),
  ...catMock('SUB', 'c1', SUBS_C1),
];

const renderStep = (props: Partial<React.ComponentProps<typeof CategoryStep>> = {}, mocks = fullMocks) => {
  const onContinue = props.onContinue ?? vi.fn();
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <CategoryStep submitting={false} onContinue={onContinue} {...props} />
    </MockedProvider>,
  );
  return { onContinue };
};

const openAndPick = async (comboName: string, optionText: string) => {
  const input = screen.getByRole('combobox', { name: comboName });
  fireEvent.mouseDown(input);
  fireEvent.click(input);
  const option = await screen.findByRole('option', { name: optionText });
  fireEvent.click(option);
};

describe('CategoryStep', () => {
  it('renders three category fields and the Continue button', () => {
    renderStep();
    expect(screen.getByRole('combobox', { name: 'Super Category *' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Category' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Sub-Category' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
  });

  it('shows a warning when submitting with no super category selected', () => {
    renderStep();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Please select a Super Category.')).toBeInTheDocument();
  });

  it('walks super → category → sub, surfacing the required-at-each-level warnings then continues', async () => {
    const { onContinue } = renderStep();

    // Pick super; categories load and the Category label gains a required marker.
    await openAndPick('Super Category *', 'Food');
    await screen.findByRole('combobox', { name: 'Category *' });

    // Category is now required but unselected → warning.
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Please select a Category.')).toBeInTheDocument();

    // Pick category; subs load and become required.
    await openAndPick('Category *', 'Snacks');
    await screen.findByRole('combobox', { name: 'Sub-Category *' });

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Please select a Sub-Category.')).toBeInTheDocument();

    // Pick sub and continue → onContinue fires with ids + labels.
    await openAndPick('Sub-Category *', 'Chips');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(onContinue).toHaveBeenCalledTimes(1));
    const [scope, labels] = onContinue.mock.calls[0];
    expect(scope).toEqual<CategoryScope>({ super_category_id: 's1', category_id: 'c1', sub_category_id: 'sub1' });
    expect(labels).toEqual({ super: 'Food', category: 'Snacks', sub: 'Chips' });
  });

  it('continues immediately for a leaf super category with no children', async () => {
    const mocks = [...catMock('SUPER', null, SUPERS), ...catMock('CATEGORY', 's1', [])];
    const { onContinue } = renderStep({}, mocks);

    await openAndPick('Super Category *', 'Food');
    // No child categories exist, so the Category field never becomes required.
    await waitFor(() =>
      expect(screen.queryByRole('combobox', { name: 'Category *' })).toBeNull(),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(onContinue).toHaveBeenCalledTimes(1));
    const [scope, labels] = onContinue.mock.calls[0];
    expect(scope).toEqual({ super_category_id: 's1', category_id: '', sub_category_id: '' });
    expect(labels.super).toBe('Food');
  });

  it('seeds the picker from initialScope and disables ids in disabledIds', async () => {
    const mocks = [
      ...catMock('SUPER', null, SUPERS),
      ...catMock('CATEGORY', 's1', CATS_S1),
      ...catMock('SUB', 'c1', SUBS_C1),
    ];
    renderStep(
      {
        initialScope: { super_category_id: 's1', category_id: 'c1', sub_category_id: '' },
        disabledIds: ['sub1'],
      },
      mocks,
    );

    // Seeded values resolve to their display labels once the option lists load.
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Super Category *' })).toHaveValue('Food'),
    );
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Category *' })).toHaveValue('Snacks'),
    );

    // The disabled sub option is rendered with aria-disabled via getOptionDisabled.
    const subInput = screen.getByRole('combobox', { name: 'Sub-Category *' });
    fireEvent.mouseDown(subInput);
    fireEvent.click(subInput);
    const chips = await screen.findByRole('option', { name: 'Chips' });
    expect(chips).toHaveAttribute('aria-disabled', 'true');
  });

  it('disables the Continue button and shows the loading label while submitting', () => {
    render(
      <MockedProvider mocks={fullMocks} addTypename={false}>
        <CategoryStep submitting onContinue={vi.fn()} />
      </MockedProvider>,
    );
    const btn = screen.getByRole('button', { name: 'Loading…' });
    expect(btn).toBeDisabled();
  });
});
