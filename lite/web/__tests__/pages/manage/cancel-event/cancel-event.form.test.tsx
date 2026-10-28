import type { MockedResponse } from '@apollo/client/testing';
import { createTranslator } from '@duncit/i18n';
import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WEB_FALLBACK } from '../../../../../shared/i18n';
import { LITE_CANCEL_EVENT } from '../../../../graphql/events';
import { CancelEventDialog, CancelEventForm, makeCancelEventSchema } from '../../../../pages/manage/cancel-event';
import { captureNotifications, renderWithProviders } from '../../../test-utils';
import { apiRefusal, hostedEvent } from '../manage-mocks';

const { t } = createTranslator({ locale: 'en-IN', fallback: WEB_FALLBACK });

const cancelMock = (reason: string | null, result: MockedResponse['result']): MockedResponse => ({ request: { query: LITE_CANCEL_EVENT, variables: { id: 'ev-1', reason } }, result });
const cancelled = { data: { liteCancelEvent: hostedEvent({ status: 'CANCELLED', cancel_reason: 'Rain', cancelled_at: '2026-11-20T10:00:00.000Z' }) } };

describe('makeCancelEventSchema', () => {
  const schema = makeCancelEventSchema(t);

  it('takes no reason at all', () => {
    expect(schema.parse({ reason: '   ' })).toEqual({ reason: '' });
  });

  it('caps the reason at 300 characters', () => {
    expect(schema.safeParse({ reason: 'x'.repeat(300) }).success).toBe(true);
    expect(schema.safeParse({ reason: 'x'.repeat(301) }).error?.issues[0]?.message).toBe('Keep this to 300 characters or fewer');
  });
});

describe('CancelEventForm', () => {
  let toasts: ReturnType<typeof captureNotifications>;

  beforeEach(() => {
    toasts = captureNotifications();
  });

  afterEach(() => {
    toasts.stop();
  });

  it('warns that guests are told and it cannot be undone', () => {
    renderWithProviders(<CancelEventForm eventId="ev-1" onCancelled={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByText('Every guest is told, and registrations close. This cannot be undone.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Reason' })).toHaveAccessibleDescription('Optional — included in the email to guests');
  });

  it('keeps the event when the host changes their mind', async () => {
    const onCancelled = vi.fn();
    const onClose = vi.fn();
    const { user } = renderWithProviders(<CancelEventForm eventId="ev-1" onCancelled={onCancelled} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Keep the event' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onCancelled).not.toHaveBeenCalled();
  });

  it('cancels with the typed reason, tells the host and closes', async () => {
    const onCancelled = vi.fn();
    const onClose = vi.fn();
    const { user } = renderWithProviders(<CancelEventForm eventId="ev-1" onCancelled={onCancelled} onClose={onClose} />, { mocks: [cancelMock('Rain', cancelled)] });

    await user.type(screen.getByRole('textbox', { name: 'Reason' }), '  Rain ');
    await user.click(screen.getByRole('button', { name: 'Cancel the event' }));

    await vi.waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onCancelled).toHaveBeenCalledTimes(1);
    expect(toasts.seen).toEqual([{ message: 'The event was cancelled and guests were told.', severity: 'success' }]);
  });

  it('sends no reason (null) when the box is blank', async () => {
    const onCancelled = vi.fn();
    const { user } = renderWithProviders(<CancelEventForm eventId="ev-1" onCancelled={onCancelled} onClose={vi.fn()} />, { mocks: [cancelMock(null, cancelled)] });

    await user.click(screen.getByRole('button', { name: 'Cancel the event' }));

    await vi.waitFor(() => expect(onCancelled).toHaveBeenCalledTimes(1));
  });

  it('stays open and shows the refusal when the API says no', async () => {
    const onCancelled = vi.fn();
    const onClose = vi.fn();
    const { user } = renderWithProviders(<CancelEventForm eventId="ev-1" onCancelled={onCancelled} onClose={onClose} />, {
      mocks: [cancelMock(null, apiRefusal('This event has already ended'))],
    });

    await user.click(screen.getByRole('button', { name: 'Cancel the event' }));

    await vi.waitFor(() => expect(toasts.seen).toEqual([{ message: 'This event has already ended', severity: 'error' }]));
    expect(onCancelled).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('CancelEventDialog', () => {
  it('renders nothing while closed', () => {
    renderWithProviders(<CancelEventDialog eventId="ev-1" open={false} onClose={vi.fn()} onCancelled={vi.fn()} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cancel-event-form')).not.toBeInTheDocument();
  });

  it('frames the cancel form under the title', () => {
    renderWithProviders(<CancelEventDialog eventId="ev-1" open onClose={vi.fn()} onCancelled={vi.fn()} />);

    const dialog = screen.getByRole('dialog', { name: 'Cancel event' });
    expect(within(dialog).getByTestId('cancel-event-form')).toBeInTheDocument();
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    renderWithProviders(<CancelEventDialog eventId="ev-1" open onClose={onClose} onCancelled={vi.fn()} />);

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(onClose).toHaveBeenCalled();
  });
});
