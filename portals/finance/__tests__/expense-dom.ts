import { expect } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';

/**
 * DOM helpers shared by the Expense suites (ledger, form, dashboard, settings).
 *
 * The configured selects render DISABLED until their `expenseOptions` query
 * answers, so a pick waits for the box to come alive first — and then for the
 * menu to finish closing, so the next pick does not find two listboxes.
 */
export async function pickOption(name: string, option: string): Promise<void> {
  const box = () => screen.getByRole('combobox', { name });
  await waitFor(() => expect(box()).not.toHaveAttribute('aria-disabled', 'true'));
  fireEvent.mouseDown(box());
  const listbox = await screen.findByRole('listbox');
  fireEvent.click(within(listbox).getByRole('option', { name: option }));
  await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
}

/** Types into a labelled text field. */
export function typeInto(label: string, value: string): void {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}
