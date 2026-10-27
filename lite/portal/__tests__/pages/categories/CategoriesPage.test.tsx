import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GraphQLError } from 'graphql';
import { LITE_ADMIN_CATEGORIES, LITE_DELETE_CATEGORY, LITE_UPSERT_CATEGORY } from '../../../graphql/catalogue';
import { CategoriesPage } from '../../../pages/categories';
import { makeCategory } from '../../fixtures';
import { gqlCategory } from '../../gql-results';
import { findConfirm, findRow, findToast, renderWithProviders, type GqlMock } from '../../test-utils';

vi.mock('@duncit/table', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/table')>();
  const { FakeDuncitTable } = await import('../../fake-table');
  return { ...actual, DuncitTable: FakeDuncitTable };
});

const music = makeCategory();
const food = makeCategory({ id: 'cat-2', name: 'Food', slug: 'food', icon: null, sort_order: 0, events_count: 0 });
const categoriesQuery = (rows = [music]): GqlMock => ({ request: { query: LITE_ADMIN_CATEGORIES }, result: { data: { liteCategories: rows.map(gqlCategory) } } });

describe('CategoriesPage', () => {
  it('lists the categories under the page header', async () => {
    renderWithProviders(<CategoriesPage />, { mocks: [categoriesQuery()] });
    expect(screen.getByRole('heading', { level: 1, name: 'Categories' })).toBeInTheDocument();
    expect((await findRow('cat-1')).getByText('MusicNote')).toBeInTheDocument();
  });

  it('shows the empty copy when there are none', async () => {
    renderWithProviders(<CategoriesPage />, { mocks: [categoriesQuery([])] });
    expect(await screen.findByTestId('table-empty')).toHaveTextContent('No categories yet. Add the first one.');
  });

  it('adds a category and shows it after the reload', async () => {
    const user = userEvent.setup();
    const upsert: GqlMock = {
      request: { query: LITE_UPSERT_CATEGORY, variables: { id: null, input: { name: 'Food', slug: null, icon: null, sort_order: 0, is_active: true } } },
      result: { data: { liteUpsertCategory: gqlCategory(food) } },
    };
    renderWithProviders(<CategoriesPage />, { mocks: [categoriesQuery(), upsert, categoriesQuery([music, food])] });
    await user.click(await screen.findByTestId('category-add'));
    await user.type(await screen.findByTestId('category-name'), 'Food');
    await user.click(screen.getByTestId('category-dialog-submit'));
    expect(await findToast('success')).toHaveTextContent('Food saved');
    expect(await findRow('cat-2')).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'New category' })).not.toBeInTheDocument());
  });

  it('saves an edit against the category id and keeps the dialog on a refusal', async () => {
    const user = userEvent.setup();
    const upsert: GqlMock = {
      request: { query: LITE_UPSERT_CATEGORY, variables: { id: 'cat-1', input: { name: 'Live music', slug: 'music', icon: 'MusicNote', sort_order: 1, is_active: true } } },
      result: { errors: [new GraphQLError('Slug already used')] },
    };
    renderWithProviders(<CategoriesPage />, { mocks: [categoriesQuery(), upsert] });
    await user.click((await findRow('cat-1')).getByRole('button', { name: 'Edit Music' }));
    const name = await screen.findByTestId('category-name');
    await user.clear(name);
    await user.type(name, 'Live music');
    await user.click(screen.getByTestId('category-dialog-submit'));
    expect(await findToast('error')).toHaveTextContent('Slug already used');
    expect(screen.getByRole('dialog', { name: 'Edit Music' })).toBeInTheDocument();
  });

  it('closes the dialog from Cancel without saving', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CategoriesPage />, { mocks: [categoriesQuery()] });
    await user.click(await screen.findByTestId('category-add'));
    await user.click(await screen.findByTestId('category-dialog-cancel'));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'New category' })).not.toBeInTheDocument());
  });

  it('deletes after confirmation and warns that events lose the category', async () => {
    const user = userEvent.setup();
    const remove = vi.fn(() => ({ data: { liteDeleteCategory: true } }));
    renderWithProviders(<CategoriesPage />, {
      mocks: [categoriesQuery(), { request: { query: LITE_DELETE_CATEGORY, variables: { id: 'cat-1' } }, result: remove }, categoriesQuery([])],
    });
    await user.click((await findRow('cat-1')).getByRole('button', { name: 'Delete Music' }));
    const confirm = within(await findConfirm());
    expect(confirm.getByText('Events filed under it keep working but lose the category.')).toBeInTheDocument();
    await user.click(confirm.getByRole('button', { name: 'Delete' }));
    expect(await findToast('success')).toHaveTextContent('Music deleted');
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('does not delete when the confirmation is dismissed', async () => {
    const user = userEvent.setup();
    const remove = vi.fn(() => ({ data: { liteDeleteCategory: true } }));
    renderWithProviders(<CategoriesPage />, { mocks: [categoriesQuery(), { request: { query: LITE_DELETE_CATEGORY, variables: { id: 'cat-1' } }, result: remove }] });
    await user.click((await findRow('cat-1')).getByRole('button', { name: 'Delete Music' }));
    await user.click(within(await findConfirm()).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument());
    expect(remove).not.toHaveBeenCalled();
  });
});
