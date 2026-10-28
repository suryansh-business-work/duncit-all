import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LiteAdminEventRow } from '../../../graphql/events';
import { EventActions } from '../../../pages/events/EventActions';
import { makeEventRow } from '../../fixtures';

const setup = (row: LiteAdminEventRow) => {
  const handlers = { onFeatured: vi.fn(), onHidden: vi.fn(), onCancel: vi.fn() };
  render(<EventActions row={row} {...handlers} />);
  return { user: userEvent.setup(), handlers };
};

describe('EventActions', () => {
  it('offers to feature, hide and cancel a plain published event', async () => {
    const row = makeEventRow();
    const { user, handlers } = setup(row);
    const feature = screen.getByRole('button', { name: 'Feature Jazz Night' });
    const hide = screen.getByRole('button', { name: 'Hide Jazz Night' });
    expect(feature).toHaveAttribute('aria-pressed', 'false');
    expect(hide).toHaveAttribute('aria-pressed', 'false');
    await user.click(feature);
    await user.click(hide);
    await user.click(screen.getByRole('button', { name: 'Cancel Jazz Night' }));
    expect(handlers.onFeatured).toHaveBeenCalledWith(row);
    expect(handlers.onHidden).toHaveBeenCalledWith(row);
    expect(handlers.onCancel).toHaveBeenCalledWith(row);
  });

  it('offers the reverse switches on a featured, hidden event, shown as pressed', () => {
    setup(makeEventRow({ featured: true, hidden: true }));
    expect(screen.getByRole('button', { name: 'Remove Jazz Night from featured' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Show Jazz Night' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('cannot cancel an event twice', () => {
    setup(makeEventRow({ status: 'CANCELLED' }));
    expect(screen.getByRole('button', { name: 'Already cancelled' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Cancel Jazz Night' })).not.toBeInTheDocument();
  });
});
