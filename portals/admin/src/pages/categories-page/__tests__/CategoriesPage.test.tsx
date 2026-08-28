import { describe, expect, it, vi } from 'vitest';
import type { MockedResponse } from '@apollo/client/testing';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import CategoriesPage from '../CategoriesPage';
import { CREATE_CATEGORY, DELETE_CATEGORY, UPDATE_CATEGORY } from '../queries';
import {
  brandingMock,
  catNode,
  categoriesMock,
  mediaNode,
  renderWithProviders,
} from './testkit';

// The shared media picker dialog owns its own upload/Pexels queries; the field
// wrapper the "All" tab card drives stays real.
vi.mock('@duncit/media-picker', () => ({ default: () => null }));

const human = catNode({ id: 's1', name: 'Human', level: 'SUPER' });
const cricket = catNode({ id: 'c1', name: 'Cricket', level: 'CATEGORY', parent_id: 's1' });

const superList = (items = [human]) => categoriesMock('SUPER', null, items);

const createMock = (
  input: Record<string, unknown>,
  id = 'new-1'
): MockedResponse => ({
  request: { query: CREATE_CATEGORY, variables: { input } },
  result: { data: { createCategory: { __typename: 'Category', id } } },
});

const updateMock = (
  categoryId: string,
  input: Record<string, unknown>
): MockedResponse => ({
  request: { query: UPDATE_CATEGORY, variables: { category_id: categoryId, input } },
  result: { data: { updateCategory: { __typename: 'Category', id: categoryId } } },
});

const deleteMock = (categoryId: string): MockedResponse => ({
  request: { query: DELETE_CATEGORY, variables: { category_id: categoryId } },
  result: { data: { deleteCategory: true } },
});

const deleteErrorMock = (categoryId: string, error: Error): MockedResponse => ({
  request: { query: DELETE_CATEGORY, variables: { category_id: categoryId } },
  error,
});

const addButtons = () =>
  screen.getAllByTestId('AddIcon').map((icon) => icon.closest('button') as HTMLButtonElement);

/**
 * The clickable list row for a category. The name can also appear as the
 * "in <parent>" caption of the next column, so only the occurrence inside a
 * row counts.
 */
const rowOf = (name: string) => {
  const row = screen
    .getAllByText(name)
    .map((node) => node.closest('div[role="button"]'))
    .find(Boolean);
  if (!row) throw new Error(`no row for ${name}`);
  return row as HTMLElement;
};

const clickRowIcon = (name: string, icon: 'EditIcon' | 'DeleteIcon') => {
  const button = within(rowOf(name)).getByTestId(icon).closest('button');
  fireEvent.click(button as HTMLButtonElement);
};

const nameField = () => screen.getByLabelText(/^Name/) as HTMLInputElement;
const dialogSave = () =>
  screen.getByRole('button', { name: /^(save|saving…)$/i }) as HTMLButtonElement;

describe('CategoriesPage', () => {
  it('renders the three drill-down columns with only super categories loaded', async () => {
    renderWithProviders(<CategoriesPage />, [brandingMock(), superList()]);

    expect(screen.getByText('Category Management')).toBeTruthy();
    expect(await screen.findByText('Human')).toBeTruthy();
    // Categories/Sub-Categories stay parked until a parent is chosen.
    expect(screen.getByText('Select a super category on the left.')).toBeTruthy();
    expect(screen.getByText('Select a category on the left.')).toBeTruthy();
    expect(addButtons().map((button) => button.disabled)).toEqual([false, true, true]);
  });

  it('creates a super category with the level and null parent baked in', async () => {
    renderWithProviders(<CategoriesPage />, [
      brandingMock(),
      superList(),
      createMock({
        name: 'Bird',
        level: 'SUPER',
        parent_id: null,
        icon: '',
        description: '',
        media: [],
        sort_order: 0,
        gift_card_image_front: '',
        gift_card_image_back: '',
      }),
      superList([human, catNode({ id: 's2', name: 'Bird', level: 'SUPER' })]),
    ]);

    await screen.findByText('Human');
    fireEvent.click(addButtons()[0]);
    expect(screen.getByText('New Super Category')).toBeTruthy();

    fireEvent.change(nameField(), { target: { value: 'Bird' } });
    fireEvent.click(dialogSave());

    expect(await screen.findByText('Saved')).toBeTruthy();
    await waitFor(() => expect(screen.queryByText('New Super Category')).toBeNull());
    // The refetch put the new row in the column.
    expect(await screen.findByText('Bird')).toBeTruthy();
  });

  it('opens an existing row prefilled and updates it', async () => {
    const existing = catNode({
      id: 's1',
      name: 'Human',
      level: 'SUPER',
      icon: 'Pets',
      description: 'People pods',
      media: [mediaNode('https://cdn.test/a.jpg')],
      sort_order: 4,
    });
    renderWithProviders(<CategoriesPage />, [
      brandingMock(),
      superList([existing]),
      updateMock('s1', {
        name: 'Humans',
        icon: 'Pets',
        description: 'People pods',
        media: [{ url: 'https://cdn.test/a.jpg', type: 'IMAGE' }],
        sort_order: 4,
        is_active: true,
        gift_card_image_front: '',
        gift_card_image_back: '',
      }),
      superList([catNode({ id: 's1', name: 'Humans', level: 'SUPER' })]),
    ]);

    await screen.findByText('Human');
    clickRowIcon('Human', 'EditIcon');

    expect(screen.getByText('Edit Super Category')).toBeTruthy();
    expect(nameField().value).toBe('Human');
    expect((screen.getByLabelText('Description') as HTMLInputElement).value).toBe('People pods');
    expect((screen.getByLabelText(/Images & Videos/) as HTMLInputElement).value).toBe(
      'https://cdn.test/a.jpg'
    );
    expect((screen.getByLabelText('Sort order') as HTMLInputElement).value).toBe('4');

    fireEvent.change(nameField(), { target: { value: 'Humans' } });
    fireEvent.click(dialogSave());

    expect(await screen.findByText('Saved')).toBeTruthy();
  });

  it('keeps the dialog open and shows the failure when the save is rejected', async () => {
    renderWithProviders(<CategoriesPage />, [
      brandingMock(),
      superList(),
      {
        request: {
          query: CREATE_CATEGORY,
          variables: {
            input: {
              name: 'Bird',
              level: 'SUPER',
              parent_id: null,
              icon: '',
              description: '',
              media: [],
              sort_order: 0,
              gift_card_image_front: '',
              gift_card_image_back: '',
            },
          },
        },
        error: new Error('slug already exists'),
      },
    ]);

    await screen.findByText('Human');
    fireEvent.click(addButtons()[0]);
    fireEvent.change(nameField(), { target: { value: 'Bird' } });
    fireEvent.click(dialogSave());

    expect(await screen.findByText('slug already exists')).toBeTruthy();
    expect(screen.getByText('New Super Category')).toBeTruthy();
    expect(screen.queryByText('Saved')).toBeNull();
  });

  it('confirms then performs a delete', async () => {
    renderWithProviders(<CategoriesPage />, [
      brandingMock(),
      superList(),
      deleteMock('s1'),
      superList([]),
    ]);

    await screen.findByText('Human');
    clickRowIcon('Human', 'DeleteIcon');

    expect(screen.getByText('Delete Super Category?')).toBeTruthy();
    expect(
      screen.getByText(/This will also remove all its categories, sub-categories/)
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Deleted')).toBeTruthy();
    await waitFor(() => expect(screen.queryByText('Delete Super Category?')).toBeNull());
  });

  it('reports a rejected delete without closing the confirmation', async () => {
    renderWithProviders(<CategoriesPage />, [
      brandingMock(),
      superList(),
      deleteErrorMock('s1', new Error('category still has pods')),
    ]);

    await screen.findByText('Human');
    clickRowIcon('Human', 'DeleteIcon');
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('category still has pods')).toBeTruthy();
    expect(screen.getByText('Delete Super Category?')).toBeTruthy();
    expect(screen.queryByText('Deleted')).toBeNull();
  });

  it('drills into the picked super category and creates below it', async () => {
    renderWithProviders(<CategoriesPage />, [
      brandingMock(),
      superList(),
      categoriesMock('CATEGORY', 's1', [cricket]),
    ]);

    await screen.findByText('Human');
    fireEvent.click(rowOf('Human'));

    expect(await screen.findByText('Cricket')).toBeTruthy();
    expect(addButtons()[1].disabled).toBe(false);

    fireEvent.click(addButtons()[1]);
    // The dialog inherits the drilled-into level, not the column it started from.
    expect(screen.getByText('New Category')).toBeTruthy();
  });

  it('edits a sub-category whose optional fields came back null', async () => {
    const bare = catNode({
      id: 'b1',
      name: 'T20',
      level: 'SUB',
      parent_id: 'c1',
      icon: null,
      description: null,
      allow_co_hosts: null,
      max_co_hosts: null,
      min_pax: null,
    });
    renderWithProviders(<CategoriesPage />, [
      brandingMock(),
      superList(),
      categoriesMock('CATEGORY', 's1', [cricket]),
      categoriesMock('SUB', 'c1', [bare]),
      updateMock('b1', {
        name: 'T20 Blast',
        icon: '',
        description: '',
        media: [],
        sort_order: 0,
        is_active: true,
        gift_card_image_front: '',
        gift_card_image_back: '',
        allow_co_hosts: false,
        max_co_hosts: 1,
        // A null min_pax from the server reads as "no minimum" in the form.
        min_pax: 0,
      }),
      superList(),
      categoriesMock('CATEGORY', 's1', [cricket]),
      categoriesMock('SUB', 'c1', [catNode({ id: 'b1', name: 'T20 Blast', level: 'SUB' })]),
    ]);

    await screen.findByText('Human');
    fireEvent.click(rowOf('Human'));
    await screen.findByText('Cricket');
    fireEvent.click(rowOf('Cricket'));
    await screen.findByText('T20');

    clickRowIcon('T20', 'EditIcon');
    expect(screen.getByText('Edit Sub-Category')).toBeTruthy();
    // Nulls become the empty/off defaults instead of reaching the inputs.
    expect((screen.getByLabelText('Icon') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Description') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Allow Co-Hosts') as HTMLInputElement).checked).toBe(false);

    fireEvent.change(nameField(), { target: { value: 'T20 Blast' } });
    fireEvent.click(dialogSave());

    expect(await screen.findByText('Saved')).toBeTruthy();
  });

  it('clears the sub-category column when the selected category is deleted', async () => {
    const t20 = catNode({ id: 'b1', name: 'T20', level: 'SUB', parent_id: 'c1' });
    renderWithProviders(<CategoriesPage />, [
      brandingMock(),
      superList(),
      categoriesMock('CATEGORY', 's1', [cricket]),
      categoriesMock('SUB', 'c1', [t20]),
      deleteMock('c1'),
      // Every open column is refetched once the delete lands.
      superList(),
      categoriesMock('CATEGORY', 's1', []),
      categoriesMock('SUB', 'c1', []),
    ]);

    await screen.findByText('Human');
    fireEvent.click(rowOf('Human'));
    await screen.findByText('Cricket');
    fireEvent.click(rowOf('Cricket'));
    await screen.findByText('T20');

    clickRowIcon('Cricket', 'DeleteIcon');
    expect(screen.getByText('Delete Category?')).toBeTruthy();
    expect(screen.getByText(/This will also remove its sub-categories, clubs and pods/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Deleted')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('Select a category on the left.')).toBeTruthy());
    expect(screen.queryByText('T20')).toBeNull();
    // The super category stays selected — only the level below it was removed.
    expect(screen.queryByText('Select a super category on the left.')).toBeNull();
  });

  it('clears the drill-down when the selected super category is deleted', async () => {
    renderWithProviders(<CategoriesPage />, [
      brandingMock(),
      superList(),
      categoriesMock('CATEGORY', 's1', [cricket]),
      deleteMock('s1'),
      superList([]),
      categoriesMock('CATEGORY', 's1', []),
    ]);

    await screen.findByText('Human');
    fireEvent.click(rowOf('Human'));
    await screen.findByText('Cricket');

    clickRowIcon('Human', 'DeleteIcon');
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Deleted')).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByText('Select a super category on the left.')).toBeTruthy()
    );
    expect(screen.queryByText('Cricket')).toBeNull();
  });
});
