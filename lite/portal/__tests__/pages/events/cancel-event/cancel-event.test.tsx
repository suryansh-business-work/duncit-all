import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LiteAdminEventRow } from '../../../../graphql/events';
import { CancelEventDialog, makeCancelEventSchema } from '../../../../pages/events/cancel-event';
import { makeEventRow } from '../../../fixtures';
import { portalT } from '../../../test-utils';

type Submit = (reason: string) => Promise<void>;
const schema = makeCancelEventSchema(portalT);

describe('makeCancelEventSchema', () => {
  it('takes no reason, or a trimmed one of up to 500 characters', () => {
    expect(schema.parse({ reason: '' })).toEqual({ reason: '' });
    expect(schema.parse({ reason: '  Venue flooded  ' })).toEqual({ reason: 'Venue flooded' });
    expect(schema.safeParse({ reason: 'r'.repeat(500) }).success).toBe(true);
  });

  it('refuses a reason longer than 500 characters', () => {
    expect(schema.safeParse({ reason: 'r'.repeat(501) }).error?.issues[0]?.message).toBe('Reason must be 500 characters or fewer');
  });
});

const dialog = (event: LiteAdminEventRow | null, onSubmit: Submit = vi.fn<Submit>(() => Promise.resolve()), busy = false) => (
  <CancelEventDialog event={event} busy={busy} onClose={vi.fn()} onSubmit={onSubmit} />
);

describe('CancelEventDialog', () => {
  it('names the event and warns that every guest is emailed', () => {
    render(dialog(makeEventRow()));
    expect(screen.getByRole('dialog', { name: 'Cancel this event?' })).toBeInTheDocument();
    expect(screen.getByText('Every guest of Jazz Night is emailed that it is cancelled. This cannot be undone.')).toBeInTheDocument();
    expect(screen.getByTestId('cancel-event-dialog-submit')).toHaveTextContent('Cancel event');
  });

  it('is closed while no event is picked', () => {
    render(dialog(null));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('confirms with the typed reason, or with none', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<Submit>(() => Promise.resolve());
    const { rerender } = render(dialog(makeEventRow(), onSubmit));
    await user.type(screen.getByTestId('cancel-event-reason'), 'Venue flooded');
    await user.click(screen.getByTestId('cancel-event-dialog-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenLastCalledWith('Venue flooded'));

    rerender(dialog(makeEventRow({ id: 'ev-2', title: 'Poetry Slam' }), onSubmit));
    await waitFor(() => expect(screen.getByTestId('cancel-event-reason')).toHaveValue(''));
    await user.click(screen.getByTestId('cancel-event-dialog-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenLastCalledWith(''));
  });

  it('refuses an over-long reason', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<Submit>(() => Promise.resolve());
    render(dialog(makeEventRow(), onSubmit));
    const reason = screen.getByTestId('cancel-event-reason');
    await user.click(reason);
    await user.paste('r'.repeat(501));
    await user.click(screen.getByTestId('cancel-event-dialog-submit'));
    expect(await screen.findByText('Reason must be 500 characters or fewer')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('locks the reason while the cancel is running', () => {
    render(dialog(makeEventRow(), undefined, true));
    expect(screen.getByTestId('cancel-event-reason')).toBeDisabled();
    expect(screen.getByTestId('cancel-event-dialog-submit')).toBeDisabled();
  });
});
