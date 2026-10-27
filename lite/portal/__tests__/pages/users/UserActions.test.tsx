import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LiteAdminUserRow } from '../../../graphql/users';
import { UserActions } from '../../../pages/users/UserActions';
import { makeMe } from '../../fixtures';

const setup = (row: LiteAdminUserRow, isSelf = false) => {
  const onChange = vi.fn();
  render(<UserActions row={row} isSelf={isSelf} onChange={onChange} />);
  return { user: userEvent.setup(), onChange };
};

describe('UserActions', () => {
  it('offers to make a member an admin and to block them', async () => {
    const row = makeMe({ name: 'Ravi' });
    const { user, onChange } = setup(row);
    const admin = screen.getByRole('button', { name: 'Make Ravi an admin' });
    const block = screen.getByRole('button', { name: 'Block Ravi' });
    expect(admin).toHaveAttribute('aria-pressed', 'false');
    expect(block).toHaveAttribute('aria-pressed', 'false');
    await user.click(admin);
    await user.click(block);
    expect(onChange).toHaveBeenNthCalledWith(1, row, 'is_admin');
    expect(onChange).toHaveBeenNthCalledWith(2, row, 'is_blocked');
  });

  it('offers the reverse on a blocked admin, shown as pressed', () => {
    setup(makeMe({ name: 'Ravi', is_admin: true, is_blocked: true }));
    expect(screen.getByRole('button', { name: 'Remove admin from Ravi' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Unblock Ravi' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('locks both switches on your own row and says why', () => {
    setup(makeMe({ name: 'Asha', is_admin: true }), true);
    const buttons = screen.getAllByRole('button', { name: 'You cannot change your own account' });
    expect(buttons).toHaveLength(2);
    for (const button of buttons) expect(button).toBeDisabled();
  });
});
