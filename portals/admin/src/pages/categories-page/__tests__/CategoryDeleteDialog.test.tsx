import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import CategoryDeleteDialog from '../CategoryDeleteDialog';
import type { CatItem, Level } from '../queries';
import { renderWithProviders } from './testkit';

// CategoriesPage.test.tsx already drives this dialog end-to-end for SUPER and
// CATEGORY deletes (confirm, reject, and the resulting selection cleanup). This
// suite covers the dialog on its own: the SUB-category label/copy branch that
// full-page flow never reaches, the busy-disables-escape guard, and the plain
// Cancel/Delete wiring.
const item = (over: Partial<CatItem> = {}): CatItem => ({
  id: 'c1',
  name: 'Cricket',
  media: [],
  level: 'CATEGORY',
  parent_id: null,
  is_active: true,
  is_system: false,
  sort_order: 0,
  allow_co_hosts: false,
  max_co_hosts: 1,
  min_pax: 0,
  gift_card_image_front: '',
  gift_card_image_back: '',
  ...over,
});

const renderDialog = (
  target: { level: Level; item: CatItem } | null,
  extra: Readonly<{ busy?: boolean; error?: string | null }> = {}
) => {
  const onClose = vi.fn();
  const onConfirm = vi.fn();
  const view = renderWithProviders(
    <CategoryDeleteDialog
      target={target}
      busy={extra.busy ?? false}
      error={extra.error ?? null}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
  return { ...view, onClose, onConfirm };
};

describe('CategoryDeleteDialog', () => {
  it('renders nothing when there is no delete target', () => {
    renderDialog(null);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('names a SUPER category and warns about the wider blast radius', () => {
    renderDialog({ level: 'SUPER', item: item({ name: 'Human' }) });

    expect(screen.getByText('Delete Super Category?')).toBeTruthy();
    expect(screen.getByText('Human')).toBeTruthy();
    expect(
      screen.getByText(/This will also remove all its categories, sub-categories, clubs, pods/)
    ).toBeTruthy();
    expect(screen.getByText(/This action cannot be undone\./)).toBeTruthy();
  });

  it('names a CATEGORY and shows the category-only warning', () => {
    renderDialog({ level: 'CATEGORY', item: item({ name: 'Cricket' }) });

    expect(screen.getByText('Delete Category?')).toBeTruthy();
    expect(screen.getByText(/This will also remove its sub-categories, clubs and pods/)).toBeTruthy();
  });

  it('labels a SUB-category and shows no super/category-specific warning', () => {
    renderDialog({ level: 'SUB', item: item({ name: 'T20' }) });

    expect(screen.getByText('Delete Sub-Category?')).toBeTruthy();
    expect(screen.getByText('T20')).toBeTruthy();
    expect(screen.queryByText(/This will also remove/)).toBeNull();
    expect(screen.getByText(/This action cannot be undone\./)).toBeTruthy();
  });

  it('shows the delete error message', () => {
    renderDialog({ level: 'SUB', item: item({ name: 'T20' }) }, { error: 'category still has pods' });

    expect(screen.getByText('category still has pods')).toBeTruthy();
  });

  it('shows no error text when there is none', () => {
    renderDialog({ level: 'SUB', item: item() });
    expect(screen.queryByText(/category still has pods/)).toBeNull();
  });

  it('confirms the delete from the Delete button', () => {
    const { onConfirm } = renderDialog({ level: 'SUB', item: item() });
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('cancels from the Cancel button', () => {
    const { onClose } = renderDialog({ level: 'SUB', item: item() });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('disables both actions and shows the busy label while deleting', () => {
    renderDialog({ level: 'SUB', item: item() }, { busy: true });

    expect((screen.getByRole('button', { name: 'Cancel' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('Deleting…')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Deleting…' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('ignores an escape-close attempt while busy', () => {
    const { onClose } = renderDialog({ level: 'SUB', item: item() }, { busy: true });
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on escape once the dialog is idle', () => {
    const { onClose } = renderDialog({ level: 'SUB', item: item() });
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
