/**
 * What the broad CategoriesPage.test.tsx never reaches: editing a category
 * whose icon is an uploaded image, a second press on Save / Delete while the
 * dialog is already fading out, and dismissing the toast.
 */
import { describe, expect, it, vi } from 'vitest';
import type { MockedResponse } from '@apollo/client/testing';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import CategoriesPage from '../CategoriesPage';
import { CREATE_CATEGORY, DELETE_CATEGORY } from '../queries';
import { brandingMock, catNode, categoriesMock, renderWithProviders } from './testkit';

vi.mock('@duncit/media-picker', () => ({ default: () => null }));

const human = catNode({ id: 's1', name: 'Human', level: 'SUPER' });

const rowOf = (name: string) => {
  const row = screen
    .getAllByText(name)
    .map((node) => node.closest('div[role="button"]'))
    .find(Boolean);
  if (!row) throw new Error(`no row for ${name}`);
  return row as HTMLElement;
};

const clickRowIcon = (name: string, icon: 'EditIcon' | 'DeleteIcon') => {
  fireEvent.click(within(rowOf(name)).getByTestId(icon).closest('button') as HTMLButtonElement);
};

const addButtons = () =>
  screen.getAllByTestId('AddIcon').map((icon) => icon.closest('button') as HTMLButtonElement);

describe('CategoriesPage — an uploaded icon', () => {
  it('opens a category whose icon is an image in image mode, showing the image URL', async () => {
    const pictured = catNode({ id: 's1', name: 'Human', level: 'SUPER', icon: 'https://cdn.duncit.com/icons/human.png' });
    renderWithProviders(<CategoriesPage />, [brandingMock(), categoriesMock('SUPER', null, [pictured])]);

    await screen.findByText('Human');
    clickRowIcon('Human', 'EditIcon');

    expect(screen.getByRole('button', { name: 'Image' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('textbox', { name: 'Category image' })).toHaveValue('https://cdn.duncit.com/icons/human.png');
  });
});

describe('CategoriesPage — a second press while the dialog closes', () => {
  it('does not create the category twice', async () => {
    let creates = 0;
    const create: MockedResponse = {
      request: { query: CREATE_CATEGORY, variables: () => true },
      result: () => {
        creates += 1;
        return { data: { createCategory: { __typename: 'Category', id: 's2' } } };
      },
    };
    renderWithProviders(<CategoriesPage />, [
      brandingMock(),
      categoriesMock('SUPER', null, [human]),
      create,
      categoriesMock('SUPER', null, [human]),
    ]);

    await screen.findByText('Human');
    fireEvent.click(addButtons()[0]);
    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'Bird' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Saved')).toBeInTheDocument();

    // The dialog is fading out; its Save button is still on screen but can no longer be pressed.
    const fadingSave = screen.getByText('Save', { selector: 'button' });
    expect(fadingSave).toBeDisabled();
    fireEvent.click(fadingSave);

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(creates).toBe(1);
  });

  it('does not delete the category twice', async () => {
    let deletes = 0;
    const remove: MockedResponse = {
      request: { query: DELETE_CATEGORY, variables: { category_id: 's1' } },
      // Would answer a second delete too — so the count below proves none was sent.
      maxUsageCount: 2,
      result: () => {
        deletes += 1;
        return { data: { deleteCategory: true } };
      },
    };
    renderWithProviders(<CategoriesPage />, [
      brandingMock(),
      categoriesMock('SUPER', null, [human]),
      remove,
      categoriesMock('SUPER', null, []),
    ]);

    await screen.findByText('Human');
    clickRowIcon('Human', 'DeleteIcon');
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('Deleted')).toBeInTheDocument();

    // The confirmation is fading out and its Delete button still takes a press.
    fireEvent.click(screen.getByText('Delete', { selector: 'button' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(deletes).toBe(1);
  });
});

describe('CategoriesPage — the toast', () => {
  it('goes away on Escape', async () => {
    renderWithProviders(<CategoriesPage />, [
      brandingMock(),
      categoriesMock('SUPER', null, [human]),
      {
        request: { query: DELETE_CATEGORY, variables: { category_id: 's1' } },
        result: { data: { deleteCategory: true } },
      },
      categoriesMock('SUPER', null, []),
    ]);

    await screen.findByText('Human');
    clickRowIcon('Human', 'DeleteIcon');
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await screen.findByText('Deleted');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    fireEvent.keyDown(document.body, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByText('Deleted')).not.toBeInTheDocument());
  });
});
