import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { FormProvider, useForm } from 'react-hook-form';
import CategorySelectors from '@/forms/fields/CategorySelectors';
import { CATEGORIES_BY_LEVEL, CATEGORIES_BY_PARENT, type CategoryOption } from '@/api/data.gql';
import { renderWithApollo } from '../helpers/renderWithApollo';

const SUPER = 'super-sports';

const category = (id: string, name: string, parent_id: string | null, is_active = true): CategoryOption => ({
  id,
  name,
  slug: id,
  parent_id,
  is_active,
  sort_order: 0,
});

const CATEGORIES = [
  category('cat-run', 'Running', SUPER),
  category('cat-cycle', 'Cycling', SUPER),
  category('cat-old', 'Archived sport', SUPER, false),
];
const SUBS = [
  category('sub-trail', 'Trail running', 'cat-run'),
  category('sub-road', 'Road cycling', 'cat-cycle'),
  category('sub-retired', 'Retired sub', 'cat-run', false),
];

const catsMock = (categories: CategoryOption[] = CATEGORIES): MockedResponse => ({
  request: { query: CATEGORIES_BY_PARENT, variables: { level: 'CATEGORY', parent_id: SUPER } },
  result: { data: { categories } },
});
const subsMock = (): MockedResponse => ({
  request: { query: CATEGORIES_BY_LEVEL, variables: { level: 'SUB' } },
  result: { data: { categories: SUBS } },
});
const subsFailMock = (): MockedResponse => ({
  request: { query: CATEGORIES_BY_LEVEL, variables: { level: 'SUB' } },
  error: new Error('Network down'),
});

type Values = { super_category_id?: string; category_ids?: string[]; sub_category_ids?: string[] };

/** A form whose category picks are printed so a test can read what the selectors wrote. */
function Harness({ initial }: Readonly<{ initial: Values }>) {
  const methods = useForm<Values>({ defaultValues: initial });
  const values = methods.watch();
  return (
    <FormProvider {...methods}>
      <CategorySelectors />
      <output data-testid="values">{JSON.stringify(values)}</output>
    </FormProvider>
  );
}

const values = () => JSON.parse(screen.getByTestId('values').textContent ?? '{}') as Values;

const openOptions = async (label: string) => {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: label }));
  return within(await screen.findByRole('listbox')).getAllByRole('option');
};

describe('CategorySelectors', () => {
  it('renders nothing until a super category is chosen, and drops categories left without one', async () => {
    const { container } = renderWithApollo(
      <Harness initial={{ super_category_id: '', category_ids: ['cat-run'], sub_category_ids: [] }} />,
      [subsMock()],
    );

    expect(screen.queryByRole('combobox')).toBeNull();
    await waitFor(() => expect(values().category_ids).toEqual([]));
    expect(container.querySelector('.MuiAutocomplete-root')).toBeNull();
  });

  it('shows a placeholder while categories load, then offers only the active ones under the super', async () => {
    const { container } = renderWithApollo(<Harness initial={{ super_category_id: SUPER }} />, [catsMock()]);

    expect(container.querySelector('.MuiSkeleton-root')).toBeInTheDocument();
    await screen.findByRole('combobox', { name: 'Category' });
    expect(screen.getByRole('combobox', { name: 'Category' })).toHaveAttribute('placeholder', 'Select categories');
    // No category is picked yet, so there is no sub-category picker.
    expect(screen.queryByRole('combobox', { name: 'Sub Category' })).toBeNull();

    const options = await openOptions('Category');
    expect(options.map((o) => o.textContent)).toEqual(['Running', 'Cycling']);
  });

  it('picking a category reveals sub-categories scoped to it', async () => {
    renderWithApollo(<Harness initial={{ super_category_id: SUPER, category_ids: [], sub_category_ids: [] }} />, [
      catsMock(),
      subsMock(),
    ]);

    await screen.findByRole('combobox', { name: 'Category' });
    fireEvent.click((await openOptions('Category'))[0]);
    expect(values().category_ids).toEqual(['cat-run']);

    await waitFor(async () => expect((await openOptions('Sub Category')).map((o) => o.textContent)).toEqual(['Trail running']));
    fireEvent.click(screen.getByRole('option', { name: 'Trail running' }));
    expect(values().sub_category_ids).toEqual(['sub-trail']);
  });

  it('keeps saved sub-categories while their options load, then prunes ones outside the chosen categories', async () => {
    renderWithApollo(
      <Harness initial={{ super_category_id: SUPER, category_ids: ['cat-run'], sub_category_ids: ['sub-trail', 'sub-road'] }} />,
      [catsMock(), subsMock()],
    );

    expect(values().sub_category_ids).toEqual(['sub-trail', 'sub-road']);
    await waitFor(() => expect(values().sub_category_ids).toEqual(['sub-trail']));
    expect(await screen.findByRole('button', { name: 'Trail running' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Running' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Sub Category' })).toHaveAttribute('placeholder', '');
  });

  it('keeps saved sub-categories when their options fail to load', async () => {
    renderWithApollo(
      <Harness initial={{ super_category_id: SUPER, category_ids: ['cat-run'], sub_category_ids: ['sub-trail'] }} />,
      [catsMock(), subsFailMock()],
    );

    await screen.findByRole('button', { name: 'Running' });
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Sub Category' })).not.toHaveAttribute('aria-busy'));
    expect(values().sub_category_ids).toEqual(['sub-trail']);
  });

  it('clears sub-categories once no category is picked', async () => {
    renderWithApollo(<Harness initial={{ super_category_id: SUPER, category_ids: [], sub_category_ids: ['sub-trail'] }} />, [
      catsMock(),
    ]);

    await waitFor(() => expect(values().sub_category_ids).toEqual([]));
  });

  it('works on a form that has no category fields yet', async () => {
    renderWithApollo(<Harness initial={{ super_category_id: SUPER }} />, [catsMock()]);

    await screen.findByRole('combobox', { name: 'Category' });
    expect(values()).toEqual({ super_category_id: SUPER });
  });
});
