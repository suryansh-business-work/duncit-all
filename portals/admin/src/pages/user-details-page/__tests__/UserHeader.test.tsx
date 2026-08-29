import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import UserHeader from '../UserHeader';
import { renderWithProviders } from './testkit';

const baseUser = { full_name: 'Riya Sharma', email: 'riya@example.com', user_id: 'u-1' };

const spies = () => ({
  setStatus: vi.fn(),
  onCallClick: vi.fn(),
  onEmailClick: vi.fn(),
  onDeleteClick: vi.fn(),
});

describe('UserHeader — title', () => {
  it("shows the user's full name as the title", () => {
    renderWithProviders(
      <UserHeader user={baseUser} status="ACTIVE" busy={false} {...spies()} />,
    );

    expect(screen.getByRole('heading', { name: 'Riya Sharma' })).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
  });

  it('falls back to email when there is no full name', () => {
    renderWithProviders(
      <UserHeader
        user={{ full_name: '', email: 'riya@example.com', user_id: 'u-1' }}
        status="ACTIVE"
        busy={false}
        {...spies()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'riya@example.com' })).toBeInTheDocument();
  });

  it('falls back to the user id when there is neither a name nor an email', () => {
    renderWithProviders(
      <UserHeader user={{ full_name: '', email: '', user_id: 'u-1' }} status="ACTIVE" busy={false} {...spies()} />,
    );

    expect(screen.getByRole('heading', { name: 'u-1' })).toBeInTheDocument();
  });
});

describe('UserHeader — call/email actions', () => {
  it('fires onCallClick and onEmailClick from their own buttons', () => {
    const s = spies();
    renderWithProviders(<UserHeader user={baseUser} status="ACTIVE" busy={false} {...s} />);

    fireEvent.click(screen.getByRole('button', { name: 'Call' }));
    fireEvent.click(screen.getByRole('button', { name: 'Email' }));

    expect(s.onCallClick).toHaveBeenCalledTimes(1);
    expect(s.onEmailClick).toHaveBeenCalledTimes(1);
  });
});

describe('UserHeader — status buttons for an ACTIVE user', () => {
  it('offers Deactivate and Block, but not Activate or Unblock', () => {
    renderWithProviders(<UserHeader user={baseUser} status="ACTIVE" busy={false} {...spies()} />);

    expect(screen.queryByRole('button', { name: 'Activate' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Deactivate' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Block' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Unblock' })).toBeNull();
  });

  it('calls setStatus with INACTIVE from Deactivate and SUSPENDED from Block', () => {
    const s = spies();
    renderWithProviders(<UserHeader user={baseUser} status="ACTIVE" busy={false} {...s} />);

    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }));
    expect(s.setStatus).toHaveBeenCalledWith('INACTIVE');

    fireEvent.click(screen.getByRole('button', { name: 'Block' }));
    expect(s.setStatus).toHaveBeenCalledWith('SUSPENDED');
  });
});

describe('UserHeader — status buttons for an INACTIVE user', () => {
  it('offers Activate and Block, but not Deactivate or Unblock', () => {
    renderWithProviders(<UserHeader user={baseUser} status="INACTIVE" busy={false} {...spies()} />);

    expect(screen.getByRole('button', { name: 'Activate' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Deactivate' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Block' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Unblock' })).toBeNull();
  });

  it('calls setStatus with ACTIVE from Activate', () => {
    const s = spies();
    renderWithProviders(<UserHeader user={baseUser} status="INACTIVE" busy={false} {...s} />);

    fireEvent.click(screen.getByRole('button', { name: 'Activate' }));
    expect(s.setStatus).toHaveBeenCalledWith('ACTIVE');
  });
});

describe('UserHeader — status buttons for a SUSPENDED user', () => {
  it('offers Activate and Unblock, but not Deactivate or Block', () => {
    renderWithProviders(<UserHeader user={baseUser} status="SUSPENDED" busy={false} {...spies()} />);

    expect(screen.getByRole('button', { name: 'Activate' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Deactivate' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Block' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Unblock' })).toBeInTheDocument();
  });

  it('calls setStatus with ACTIVE from both Activate and Unblock', () => {
    const s = spies();
    renderWithProviders(<UserHeader user={baseUser} status="SUSPENDED" busy={false} {...s} />);

    fireEvent.click(screen.getByRole('button', { name: 'Unblock' }));
    expect(s.setStatus).toHaveBeenCalledWith('ACTIVE');
  });
});

describe('UserHeader — delete and busy state', () => {
  it('fires onDeleteClick from the Delete button', () => {
    const s = spies();
    renderWithProviders(<UserHeader user={baseUser} status="ACTIVE" busy={false} {...s} />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(s.onDeleteClick).toHaveBeenCalledTimes(1);
  });

  it('disables every status/delete action while busy, but not Call/Email', () => {
    renderWithProviders(<UserHeader user={baseUser} status="ACTIVE" busy {...spies()} />);

    expect(screen.getByRole('button', { name: 'Deactivate' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Block' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Call' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Email' })).not.toBeDisabled();
  });
});
