import { fireEvent, screen, within } from '@testing-library/react';

/**
 * Filters an enum column the way an agent does: the column header's filter
 * button, one option in its popover, then Apply.
 *
 * A multiple select stays open after a pick and hides the rest of the page
 * while it is, so it is closed before Apply is reached.
 */
export async function applyEnumColumnFilter(field: string, header: string, option: string): Promise<void> {
  fireEvent.click(screen.getByTestId(`table-filter-${field}`));
  const popover = within(await screen.findByRole('dialog', { name: `Filter ${header}` }));
  fireEvent.mouseDown(popover.getByRole('combobox', { name: header }));
  fireEvent.click(await screen.findByRole('option', { name: option }));
  fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
  fireEvent.click(await popover.findByRole('button', { name: 'Apply' }));
}
