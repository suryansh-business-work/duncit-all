import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DuncitUser } from '@duncit/user-context';
import { UserMenu } from '../src/chrome/UserMenu';

const navigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));

const user = { full_name: 'Ada Lovelace', email: 'ada@x.test' } as DuncitUser;

describe('UserMenu', () => {
  beforeEach(() => navigate.mockClear());

  it('shows the name + email and navigates to the profile route', async () => {
    const u = userEvent.setup();
    render(<UserMenu user={user} fallbackName="Portal" profileTo="/profile" onLogout={vi.fn()} />);
    expect(screen.getByText('ada@x.test')).toBeInTheDocument();
    await u.click(screen.getByLabelText('account menu'));
    await u.click(screen.getByText('Profile'));
    expect(navigate).toHaveBeenCalledWith('/profile');
  });

  it('omits the profile item and hides the email when unavailable', async () => {
    const u = userEvent.setup();
    const onLogout = vi.fn();
    render(<UserMenu fallbackName="Portal" onLogout={onLogout} />);
    expect(screen.queryByText('ada@x.test')).not.toBeInTheDocument();
    await u.click(screen.getByLabelText('account menu'));
    expect(screen.queryByText('Profile')).not.toBeInTheDocument();
    await u.click(screen.getByText('Logout'));
    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('closes the menu on escape without acting', async () => {
    const u = userEvent.setup();
    const onLogout = vi.fn();
    render(<UserMenu user={user} fallbackName="Portal" profileTo="/profile" onLogout={onLogout} />);
    await u.click(screen.getByLabelText('account menu'));
    expect(screen.getByText('Logout')).toBeInTheDocument();
    await u.keyboard('{Escape}');
    expect(navigate).not.toHaveBeenCalled();
    expect(onLogout).not.toHaveBeenCalled();
  });
});
