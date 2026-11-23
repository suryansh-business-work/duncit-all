import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DuncitUser } from '@duncit/user-context';
import { UserMenu } from '../src/chrome/UserMenu';

vi.mock('../src/chrome/user-roles/UserRolesDialog', () => ({
  UserRolesDialog: ({ roles, onClose }: { roles: string[]; onClose: () => void }) => (
    <div data-testid="roles-dialog">
      {roles.join(',')}
      <button type="button" data-testid="roles-dialog-close" onClick={onClose}>
        close
      </button>
    </div>
  ),
}));

const navigate = vi.hoisted(() => vi.fn());
vi.mock('react-router', () => ({ useNavigate: () => navigate }));

const user = { user_id: 'u1', full_name: 'Ada Lovelace', email: 'ada@x.test' } as DuncitUser;

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

  it('keeps the role out of the header and shows it at the top of the account menu', async () => {
    const u = userEvent.setup();
    const withRoles = { ...user, roles: ['FINANCE_MANAGER', 'HR_MANAGER'] } as DuncitUser;
    render(<UserMenu user={withRoles} fallbackName="Portal" onLogout={vi.fn()} />);
    const header = screen.getByTestId('shell-user-menu-button');
    expect(header).toHaveTextContent('Ada Lovelace');
    expect(header).toHaveTextContent('ada@x.test');
    expect(header).not.toHaveTextContent('FINANCE MANAGER');
    expect(screen.queryByTestId('shell-user-menu-role')).not.toBeInTheDocument();
    await u.click(screen.getByLabelText('account menu'));
    const role = screen.getByTestId('shell-user-menu-role');
    expect(role).toHaveTextContent('FINANCE MANAGER +1');
    expect(screen.getByRole('menu')).toContainElement(role);
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Logout']);
  });

  it('opens the roles dialog from the info icon', async () => {
    const u = userEvent.setup();
    const withRoles = { ...user, roles: ['FINANCE_MANAGER', 'HR_MANAGER'] } as DuncitUser;
    render(<UserMenu user={withRoles} fallbackName="Portal" onLogout={vi.fn()} />);
    expect(screen.queryByTestId('roles-dialog')).not.toBeInTheDocument();
    await u.click(screen.getByTestId('shell-user-roles-info'));
    expect(screen.getByTestId('roles-dialog')).toHaveTextContent('FINANCE_MANAGER,HR_MANAGER');
  });

  it('unmounts the roles dialog when it asks to be closed, and opens a fresh one from the icon again', async () => {
    const u = userEvent.setup();
    const withRoles = { ...user, roles: ['FINANCE_MANAGER'] } as DuncitUser;
    render(<UserMenu user={withRoles} fallbackName="Portal" onLogout={vi.fn()} />);
    await u.click(screen.getByTestId('shell-user-roles-info'));
    expect(screen.getByTestId('roles-dialog')).toBeInTheDocument();
    await u.click(screen.getByTestId('roles-dialog-close'));
    expect(screen.queryByTestId('roles-dialog')).not.toBeInTheDocument();
    await u.click(screen.getByTestId('shell-user-roles-info'));
    expect(screen.getByTestId('roles-dialog')).toHaveTextContent('FINANCE_MANAGER');
  });

  it('shows no role line in the menu when the account has no roles', async () => {
    const u = userEvent.setup();
    render(<UserMenu user={user} fallbackName="Portal" onLogout={vi.fn()} />);
    await u.click(screen.getByLabelText('account menu'));
    expect(screen.getByText('Logout')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-user-menu-role')).not.toBeInTheDocument();
    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
  });
});
