/**
 * The two meeting dialogs, driven end to end against mocked GraphQL.
 *
 * A cancel or a reschedule is a write the server refuses without a reason, so
 * the form must block an empty one before the mutation ever fires; a failed
 * write must surface the server's message and leave the dialog open; and while
 * a write is in flight the dialog must refuse to close under it.
 */
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import CancelMeetingDialog from '../src/CancelMeetingDialog';
import RescheduleMeetingDialog from '../src/RescheduleMeetingDialog';
import {
  LABELS,
  SLOT_CURRENT,
  SLOT_OPEN,
  SLOT_TAKEN,
  cancelMock,
  meetingSlotsMock,
  pressEscape,
  rescheduleMock,
  settle,
  submitReason,
  tile,
  wrap,
} from './test-utils';

const REASON = 'Clashes with work';

afterEach(() => {
  vi.clearAllMocks();
});

describe('CancelMeetingDialog', () => {
  const props = { open: true, kind: 'HOST' };

  it('refuses an empty reason, then cancels and reports done', async () => {
    const onDone = vi.fn();
    wrap(<CancelMeetingDialog {...props} onClose={vi.fn()} onDone={onDone} />, [cancelMock(REASON)]);
    await settle();

    expect(screen.getByText(LABELS.cancelTitle)).toBeInTheDocument();
    expect(screen.getByText(LABELS.cancelReasonHint)).toBeInTheDocument();

    await submitReason('cancel-reason-form', '   ');
    expect(screen.getByText(LABELS.reasonRequired)).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();

    await submitReason('cancel-reason-form', REASON);
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  });

  it("shows the server's message when the cancel is refused", async () => {
    const onDone = vi.fn();
    wrap(
      <CancelMeetingDialog {...props} onClose={vi.fn()} onDone={onDone} />,
      [cancelMock(REASON, 'HOST', { result: undefined, error: new Error('Meeting already held') })],
    );
    await settle();

    await submitReason('cancel-reason-form', REASON);

    await waitFor(() => expect(screen.getByText('Meeting already held')).toBeInTheDocument());
    expect(onDone).not.toHaveBeenCalled();
  });

  it('falls back to the generic failure line when what threw is not an Error', async () => {
    const onDone = vi.fn(() => {
      throw 'not an error';
    });
    wrap(<CancelMeetingDialog {...props} onClose={vi.fn()} onDone={onDone} />, [cancelMock(REASON)]);
    await settle();

    await submitReason('cancel-reason-form', REASON);

    await waitFor(() => expect(screen.getByText(LABELS.cancelFailed)).toBeInTheDocument());
  });

  it('closes on Escape while idle, but not while the cancel is in flight', async () => {
    const onClose = vi.fn();
    wrap(
      <CancelMeetingDialog {...props} onClose={onClose} onDone={vi.fn()} />,
      [cancelMock(REASON, 'HOST', { delay: Number.POSITIVE_INFINITY })],
    );
    await settle();

    await pressEscape();
    expect(onClose).toHaveBeenCalledTimes(1);

    await submitReason('cancel-reason-form', REASON);
    await waitFor(() => expect(screen.getByText(LABELS.cancelling)).toBeInTheDocument());

    await pressEscape();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('RescheduleMeetingDialog', () => {
  const props = { open: true, kind: 'HOST', bookedAt: SLOT_CURRENT };

  it('loads the slots, locks the current and the taken ones, and moves to a picked one', async () => {
    const onDone = vi.fn();
    wrap(
      <RescheduleMeetingDialog {...props} onClose={vi.fn()} onDone={onDone} />,
      [meetingSlotsMock(), rescheduleMock(REASON)],
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    await settle();

    expect(screen.getByText(LABELS.rescheduleTitle)).toBeInTheDocument();
    expect(screen.getByText(LABELS.currentlyBooked(''))).toBeInTheDocument();
    expect(tile(SLOT_CURRENT)).toHaveAttribute('aria-disabled', 'true');
    expect(tile(SLOT_CURRENT)).toHaveTextContent('Current');
    expect(tile(SLOT_TAKEN)).toHaveAttribute('aria-disabled', 'true');
    expect(tile(SLOT_OPEN)).toHaveAttribute('aria-disabled', 'false');

    // A reason without a slot is refused before the mutation.
    await submitReason('reschedule-reason-form', REASON);
    expect(screen.getByText(LABELS.pickSlot)).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();

    fireEvent.click(tile(SLOT_OPEN));
    await settle();
    expect(screen.getByText(LABELS.movingFromTo('', ''))).toBeInTheDocument();

    await submitReason('reschedule-reason-form', REASON);
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  });

  it("shows the server's message and re-reads the slots when the move is refused", async () => {
    const onDone = vi.fn();
    wrap(
      <RescheduleMeetingDialog {...props} bookedAt={null} onClose={vi.fn()} onDone={onDone} />,
      [
        meetingSlotsMock(),
        rescheduleMock(REASON, { result: undefined, error: new Error('Slot just got taken') }),
        meetingSlotsMock(),
      ],
    );
    await settle();

    expect(screen.queryByText(LABELS.currentlyBooked(''))).not.toBeInTheDocument();
    fireEvent.click(tile(SLOT_OPEN));
    await settle();
    await submitReason('reschedule-reason-form', REASON);

    await waitFor(() => expect(screen.getByText('Slot just got taken')).toBeInTheDocument());
    expect(onDone).not.toHaveBeenCalled();
  });

  it('falls back to the generic failure line when what threw is not an Error', async () => {
    const onDone = vi.fn(() => {
      throw 'not an error';
    });
    wrap(
      <RescheduleMeetingDialog {...props} onClose={vi.fn()} onDone={onDone} />,
      [meetingSlotsMock(), rescheduleMock(REASON), meetingSlotsMock()],
    );
    await settle();

    fireEvent.click(tile(SLOT_OPEN));
    await settle();
    await submitReason('reschedule-reason-form', REASON);

    await waitFor(() => expect(screen.getByText(LABELS.rescheduleFailed)).toBeInTheDocument());
  });

  it('closes on Escape while idle, but not while the move is in flight', async () => {
    const onClose = vi.fn();
    wrap(
      <RescheduleMeetingDialog {...props} onClose={onClose} onDone={vi.fn()} />,
      [meetingSlotsMock(), rescheduleMock(REASON, { delay: Number.POSITIVE_INFINITY })],
    );
    await settle();

    await pressEscape();
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(tile(SLOT_OPEN));
    await settle();
    await submitReason('reschedule-reason-form', REASON);
    await waitFor(() => expect(screen.getByText(LABELS.moving)).toBeInTheDocument());

    await pressEscape();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
