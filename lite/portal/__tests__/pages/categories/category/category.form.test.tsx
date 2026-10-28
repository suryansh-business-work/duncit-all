import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LiteAdminCategory } from '../../../../graphql/catalogue';
import { CategoryForm, type CategoryFormValues } from '../../../../pages/categories/category';
import { makeCategory } from '../../../fixtures';

type Submit = (values: CategoryFormValues) => Promise<void>;

const form = ({ open = true, initial = null, busy = false, onSubmit = vi.fn<Submit>(() => Promise.resolve()) }: { open?: boolean; initial?: LiteAdminCategory | null; busy?: boolean; onSubmit?: Submit } = {}) => (
  <CategoryForm open={open} initial={initial} busy={busy} onClose={vi.fn()} onSubmit={onSubmit} />
);

describe('CategoryForm', () => {
  it('opens empty as New category with the icon hint', () => {
    render(form());
    expect(screen.getByRole('dialog', { name: 'New category' })).toBeInTheDocument();
    expect(screen.getByTestId('category-name')).toHaveValue('');
    expect(screen.getByText('An @mui/icons-material name, for example MusicNote')).toBeInTheDocument();
    expect(screen.getByLabelText('Active')).toBeChecked();
  });

  it('submits a new category as typed', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<Submit>(() => Promise.resolve());
    render(form({ onSubmit }));
    await user.type(screen.getByTestId('category-name'), 'Food');
    await user.type(screen.getByTestId('category-icon'), 'Restaurant');
    await user.click(screen.getByLabelText('Active'));
    await user.click(screen.getByTestId('category-dialog-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({ name: 'Food', slug: '', icon: 'Restaurant', sort_order: '0', is_active: false });
  });

  it('fills the stored category when editing', () => {
    render(form({ initial: makeCategory() }));
    expect(screen.getByRole('dialog', { name: 'Edit Music' })).toBeInTheDocument();
    expect(screen.getByTestId('category-icon')).toHaveValue('MusicNote');
    expect(screen.getByTestId('category-sort-order')).toHaveValue('1');
  });

  it('refuses a bad icon name and an oversized sort order', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<Submit>(() => Promise.resolve());
    render(form({ initial: makeCategory(), onSubmit }));
    await user.type(screen.getByTestId('category-icon'), '-x');
    const sort = screen.getByTestId('category-sort-order');
    await user.clear(sort);
    await user.type(sort, '12345');
    await user.click(screen.getByTestId('category-dialog-submit'));
    expect(await screen.findByText('Use an icon name such as MusicNote')).toBeInTheDocument();
    expect(screen.getByText('Sort order must be 9999 or less')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('clears an edit when reopened for a new category', async () => {
    const { rerender } = render(form({ initial: makeCategory() }));
    rerender(form({ open: false, initial: null }));
    rerender(form({ open: true, initial: null }));
    await waitFor(() => expect(screen.getByTestId('category-name')).toHaveValue(''));
  });

  it('locks every field while saving', () => {
    render(form({ busy: true }));
    for (const id of ['category-name', 'category-slug', 'category-icon', 'category-sort-order', 'category-active']) {
      expect(screen.getByTestId(id), id).toBeDisabled();
    }
  });
});
