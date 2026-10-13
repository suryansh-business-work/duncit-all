import { describe, expect, it } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { useForm, type Resolver, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { EMPTY_CATEGORY, type AdminCategoryValue } from '@duncit/category';
import { useTranslation } from '@duncit/shell';
import { renderWithProviders } from '../../../../__tests__/testkit';
import VenueCategoriesField from '../fields/VenueCategoriesField';
import { makeVenueFormSchema } from '../schema';
import { blankVenueValues, type VenueFormValues } from '../types';
import { CATAN, CHESS, HALF_PICKED, catalogueMocks } from './catalogues';

/**
 * The venue's category rows, mounted in a form that validates with the venue
 * schema — so what the rows show is what a real Save would say.
 */
interface Options {
  categories?: AdminCategoryValue[];
  limit?: number;
  min?: number;
}

function mount({ categories = [], limit = 5, min = 0 }: Options = {}) {
  const live: { form: UseFormReturn<VenueFormValues> | null } = { form: null };
  function Harness() {
    const { t } = useTranslation();
    const form = useForm<VenueFormValues, unknown, VenueFormValues>({
      resolver: zodResolver(makeVenueFormSchema(t)) as unknown as Resolver<
        VenueFormValues,
        unknown,
        VenueFormValues
      >,
      defaultValues: { ...blankVenueValues, categories },
    });
    live.form = form;
    return <VenueCategoriesField control={form.control} limit={limit} min={min} />;
  }
  renderWithProviders(<Harness />, { mocks: catalogueMocks });
  return () => {
    if (!live.form) throw new Error('The form harness has not rendered');
    return live.form;
  };
}

const addButton = () => screen.getByRole('button', { name: 'Add category' });

describe('VenueCategoriesField', () => {
  it('opens on no row for a venue with no category, under the form own legend and hint', () => {
    mount();

    expect(screen.getByRole('group', { name: 'Venue categories' })).toBeInTheDocument();
    expect(screen.getByText(/The first one is the primary category/)).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Category 1' })).not.toBeInTheDocument();
    expect(addButton()).toBeEnabled();
  });

  it('shows one row per category and marks only the first as the primary', async () => {
    mount({ categories: [CATAN, CHESS] });

    const rows = within(screen.getByTestId('venue-categories'));
    await waitFor(() =>
      expect(
        rows.getAllByRole('combobox', { name: /Sub Category/ }).map((input) => (input as HTMLInputElement).value),
      ).toEqual(['Catan Night', 'Chess']),
    );
    expect(within(screen.getByRole('group', { name: 'Category 1' })).getByText('Primary')).toBeInTheDocument();
    expect(within(screen.getByRole('group', { name: 'Category 2' })).queryByText('Primary')).not.toBeInTheDocument();
  });

  it('adds a blank row, and removes exactly the row it is asked to', async () => {
    const form = mount({ categories: [CATAN, CHESS] });

    fireEvent.click(addButton());
    await waitFor(() => expect(form().getValues('categories')).toEqual([CATAN, CHESS, EMPTY_CATEGORY]));

    fireEvent.click(screen.getByRole('button', { name: 'Remove category 1' }));
    await waitFor(() => expect(form().getValues('categories')).toEqual([CHESS, EMPTY_CATEGORY]));
  });

  it('lets the last row go when the venue had no category to begin with', async () => {
    const form = mount({ categories: [CATAN], min: 0 });

    const remove = screen.getByRole('button', { name: 'Remove category 1' });
    expect(remove).toBeEnabled();
    fireEvent.click(remove);
    await waitFor(() => expect(form().getValues('categories')).toEqual([]));
  });

  it('keeps the last row of a venue that already has categories', () => {
    // An empty list leaves the stored categories alone, so removing the last
    // row would be an edit that did not save.
    mount({ categories: [CATAN], min: 1 });

    expect(screen.getByRole('button', { name: 'Remove category 1' })).toBeDisabled();
  });

  it('stops adding at the limit the config states, and says what it is', () => {
    mount({ categories: [CATAN, CHESS], limit: 2 });

    expect(addButton()).toBeDisabled();
    expect(screen.getByText('A venue can have at most 2 categories.')).toBeInTheDocument();
  });

  it('says "only 1" when the limit is one', () => {
    mount({ categories: [CATAN], limit: 1 });

    expect(screen.getByText('A venue can have only 1 category.')).toBeInTheDocument();
  });

  it('writes the picked sub category into its own row', async () => {
    const form = mount({ categories: [HALF_PICKED] });

    fireEvent.keyDown(screen.getByRole('combobox', { name: /Sub Category/ }), { key: 'ArrowDown' });
    fireEvent.click(await screen.findByText('Chess'));

    await waitFor(() => expect(form().getValues('categories')).toEqual([CHESS]));
  });

  it('tells a half-picked row what it is missing once the form is checked', async () => {
    const form = mount({ categories: [CATAN, HALF_PICKED] });

    await act(async () => {
      await form().trigger('categories');
    });

    expect(
      await within(screen.getByRole('group', { name: 'Category 2' })).findByText(
        'Select the super category, category and sub category.',
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('group', { name: 'Category 1' })).queryByText(
        'Select the super category, category and sub category.',
      ),
    ).not.toBeInTheDocument();
  });

  it('flags a repeated sub category on the later row as soon as it is picked', async () => {
    mount({ categories: [CATAN, CATAN] });

    expect(
      await within(screen.getByRole('group', { name: 'Category 2' })).findByText(
        'This sub category is already added above',
      ),
    ).toBeInTheDocument();
  });
});
