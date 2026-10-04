/**
 * The Manage Roles dialog. The page owns the role set and the save; the dialog
 * shows a switch per portal role, reports toggles, and must not let a save be
 * sent twice while one is already in flight.
 */
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RolesDialog from '../RolesDialog';
import { renderWithProviders } from './testkit';

const renderDialog = (over: Partial<Parameters<typeof RolesDialog>[0]> = {}) => {
  const props = {
    open: true,
    onClose: vi.fn(),
    selectedRoles: new Set<string>(['USER']),
    toggleRole: vi.fn(),
    saveRoles: vi.fn(),
    busy: false,
    hostProfile: null,
    hostCategories: [],
    setHostCategories: vi.fn(),
    ...over,
  };
  renderWithProviders(<RolesDialog {...props} />);
  return props;
};

describe('RolesDialog', () => {
  it('saves through the page and closes through the page', () => {
    const props = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(props.saveRoles).toHaveBeenCalledTimes(1);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('shows the save in flight and refuses a second one while busy', () => {
    const props = renderDialog({ busy: true });

    const saving = screen.getByRole('button', { name: 'Saving…' });
    expect(saving).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
    fireEvent.click(saving);

    expect(props.saveRoles).not.toHaveBeenCalled();
  });

  it('reflects the selected roles and reports a toggle by role key', () => {
    const props = renderDialog({ selectedRoles: new Set(['USER', 'VENUE_OWNER']) });

    expect(screen.getByRole('switch', { name: /Venue Owner/ })).toBeChecked();
    expect(screen.getByRole('switch', { name: /^Club Admin/ })).not.toBeChecked();
    // The base User role is granted by default and cannot be switched off.
    expect(screen.getByRole('switch', { name: /^User/ })).toBeDisabled();

    fireEvent.click(screen.getByRole('switch', { name: /^Club Admin/ }));

    expect(props.toggleRole).toHaveBeenCalledWith('CLUB_ADMIN');
  });

  it('shows host categories only while the Host role is selected', () => {
    renderDialog({ selectedRoles: new Set(['USER', 'HOST']) });

    // No host profile yet: the section says why there is nothing to attach to.
    expect(screen.getByTestId('host-categories-no-profile')).toBeInTheDocument();
  });

  it('leaves host categories out for a user who is not a host', () => {
    renderDialog();

    expect(screen.queryByTestId('host-categories-no-profile')).toBeNull();
    expect(screen.queryByTestId('host-categories')).toBeNull();
  });
});
