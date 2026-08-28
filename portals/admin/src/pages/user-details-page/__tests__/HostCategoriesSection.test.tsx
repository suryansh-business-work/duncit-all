import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { ADMIN_CATEGORIES, EMPTY_CATEGORY, type AdminCategoryValue } from '@duncit/category';
import HostCategoriesSection, {
  isCompleteRow,
  type HostProfileSummary,
} from '../HostCategoriesSection';
import { renderWithProviders } from './testkit';

const HOST_PROFILE: HostProfileSummary = { id: 'host-1', status: 'APPROVED' };

const completeRow = (over: Partial<AdminCategoryValue> = {}): AdminCategoryValue => ({
  super_id: 'sup-1',
  super_name: 'Fitness',
  category_id: 'cat-1',
  category_name: 'Yoga',
  sub_id: 'sub-1',
  sub_name: 'Power Yoga',
  ...over,
});

const categoriesMock: MockedResponse = {
  request: { query: ADMIN_CATEGORIES },
  result: {
    data: {
      categories: [
        { __typename: 'Category', id: 'sup-1', name: 'Fitness', slug: 'fitness', level: 'SUPER', parent_id: null, min_pax: null },
        { __typename: 'Category', id: 'sup-2', name: 'Food', slug: 'food', level: 'SUPER', parent_id: null, min_pax: null },
        { __typename: 'Category', id: 'cat-1', name: 'Yoga', slug: 'yoga', level: 'CATEGORY', parent_id: 'sup-1', min_pax: null },
        { __typename: 'Category', id: 'sub-1', name: 'Power Yoga', slug: 'power-yoga', level: 'SUB', parent_id: 'cat-1', min_pax: 2 },
      ],
    },
  },
  maxUsageCount: Number.POSITIVE_INFINITY,
};

describe('isCompleteRow', () => {
  it('is complete only once all three levels are chosen', () => {
    expect(isCompleteRow(completeRow())).toBe(true);
    expect(isCompleteRow(EMPTY_CATEGORY)).toBe(false);
    expect(isCompleteRow(completeRow({ sub_id: '' }))).toBe(false);
    expect(isCompleteRow(completeRow({ category_id: '' }))).toBe(false);
    expect(isCompleteRow(completeRow({ super_id: '' }))).toBe(false);
  });
});

describe('HostCategoriesSection — no host profile', () => {
  it('explains there is nothing to attach categories to, instead of a picker', () => {
    renderWithProviders(
      <HostCategoriesSection hostProfile={null} rows={[]} setRows={vi.fn()} />,
    );

    expect(screen.getByTestId('host-categories-no-profile')).toBeInTheDocument();
    expect(screen.queryByTestId('host-categories')).toBeNull();
  });
});

describe('HostCategoriesSection — with a host profile', () => {
  it('shows the empty-categories notice and adds one row on "Add category"', async () => {
    const setRows = vi.fn();
    renderWithProviders(
      <HostCategoriesSection hostProfile={HOST_PROFILE} rows={[]} setRows={setRows} />,
      { mocks: [categoriesMock] },
    );

    expect(screen.getByTestId('host-categories-empty')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add category' }));

    expect(setRows).toHaveBeenCalledWith([EMPTY_CATEGORY]);
  });

  it('hides the empty-categories notice once a row exists', async () => {
    renderWithProviders(
      <HostCategoriesSection hostProfile={HOST_PROFILE} rows={[EMPTY_CATEGORY]} setRows={vi.fn()} />,
      { mocks: [categoriesMock] },
    );

    await waitFor(() => expect(screen.getByLabelText('Super Category')).toBeInTheDocument());
    expect(screen.queryByTestId('host-categories-empty')).toBeNull();
  });

  it('removes only the row whose delete button was clicked', async () => {
    const setRows = vi.fn();
    const rows = [completeRow(), completeRow({ sub_id: 'sub-9', sub_name: 'Zumba' })];
    renderWithProviders(
      <HostCategoriesSection hostProfile={HOST_PROFILE} rows={rows} setRows={setRows} />,
      { mocks: [categoriesMock] },
    );

    const removeButtons = await screen.findAllByRole('button', { name: 'Remove category' });
    expect(removeButtons).toHaveLength(2);
    fireEvent.click(removeButtons[1]);

    expect(setRows).toHaveBeenCalledWith([rows[0]]);
  });

  it('updates only the picked row when a Super Category is chosen from a real cascade', async () => {
    function Harness() {
      const [rows, setRows] = useState<AdminCategoryValue[]>([EMPTY_CATEGORY, EMPTY_CATEGORY]);
      return <HostCategoriesSection hostProfile={HOST_PROFILE} rows={rows} setRows={setRows} />;
    }
    renderWithProviders(<Harness />, { mocks: [categoriesMock] });

    const superSelects = await screen.findAllByRole('combobox', { name: 'Super Category' });
    expect(superSelects).toHaveLength(2);

    fireEvent.keyDown(superSelects[0], { key: 'ArrowDown' });
    fireEvent.click(await screen.findByText('Fitness'));

    await waitFor(() => expect(superSelects[0]).toHaveValue('Fitness'));
    // The second row's own Super Category select is untouched.
    expect(superSelects[1]).toHaveValue('');
  });
});
