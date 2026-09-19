/**
 * What LocaleDialog.test.tsx leaves out: the sort-order validation message,
 * the flag switches writing back into the submitted row, and the picker's
 * full list when it is opened before anything is typed.
 */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../../../__tests__/testkit';
import LocaleDialog from '../LocaleDialog';
import type { LocaleRow } from '../queries';

const hindi: LocaleRow = {
  id: 'l2',
  code: 'hi-IN',
  label: 'हिन्दी',
  english_label: 'Hindi (India)',
  is_rtl: false,
  is_active: true,
  is_default: false,
  sort_order: 1,
};

const openDialog = (editing: LocaleRow | null = hindi) => {
  const onSubmit = vi.fn();
  renderWithProviders(
    <LocaleDialog open editing={editing} saving={false} onClose={vi.fn()} onSubmit={onSubmit} />,
  );
  return onSubmit;
};

describe('LocaleDialog — sort order', () => {
  it('keeps the hint until a negative order is submitted, then blocks the save', async () => {
    const onSubmit = openDialog();
    const sortOrder = screen.getByRole('spinbutton', { name: 'Sort order' });
    expect(screen.getByText('Order in the language switcher')).toBeInTheDocument();

    fireEvent.change(sortOrder, { target: { value: '-2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(sortOrder).toHaveAttribute('aria-invalid', 'true'));
    expect(screen.queryByText('Order in the language switcher')).toBeNull();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('LocaleDialog — flag switches', () => {
  it('submits the direction, active and default flags as switched', async () => {
    const onSubmit = openDialog();

    fireEvent.click(screen.getByRole('switch', { name: 'Right-to-left script' }));
    fireEvent.click(screen.getByRole('switch', { name: /Default language/ }));
    fireEvent.click(screen.getByRole('switch', { name: /Active — offered in the language switcher/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      code: 'hi-IN',
      is_rtl: true,
      is_default: true,
      is_active: false,
    });
  });
});

describe('LocalePicker — opened before typing', () => {
  it('lists the whole catalogue, each row with its own and English name', () => {
    openDialog(null);

    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown' });

    const options = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(options.length).toBeGreaterThan(100);
    const hindiOption = options.find((option) => option.textContent?.endsWith('· hi'));
    expect(hindiOption).toBeDefined();
    expect(hindiOption).toHaveTextContent('Hindi');
  });
});
