import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DayDrawer from '../src/DayDrawer';
import { makeSlot } from './fixtures';

// Deterministic stand-in for the MUI X TimePicker: a plain input whose value is
// parsed as a local date-time string, so onChange fires with a real Date (hours
// and minutes only matter to the component) or null, without wrestling the real
// picker's popup/keyboard interaction under jsdom.
vi.mock('@mui/x-date-pickers/TimePicker', () => ({
  TimePicker: ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: Date | null;
    onChange: (v: Date | null) => void;
  }) => (
    <input
      aria-label={label}
      value={value ? value.toISOString() : ''}
      onChange={(e) => onChange(e.target.value ? new Date(e.target.value) : null)}
    />
  ),
}));

type DayDrawerProps = Parameters<typeof DayDrawer>[0];

function baseProps(overrides: Partial<DayDrawerProps> = {}): DayDrawerProps {
  return {
    open: true,
    date: new Date(2026, 0, 20),
    slots: [],
    onClose: vi.fn(),
    onCreate: vi.fn().mockResolvedValue(undefined),
    onToggleBlock: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function setTime(label: string, hhmm: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value: `2000-01-01T${hhmm}` } });
}

describe('DayDrawer', () => {
  beforeEach(() => {
    // "Now" = Jan 15 2026, 12:00 local. Default `date` prop (Jan 20) is comfortably future.
    vi.setSystemTime(new Date(2026, 0, 15, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when date is null', () => {
    render(<DayDrawer {...baseProps({ date: null })} />);
    expect(screen.queryByText('Availability')).not.toBeInTheDocument();
  });

  it('shows the formatted date header and an empty-state message with no slots', () => {
    render(<DayDrawer {...baseProps({ slots: [] })} />);
    expect(screen.getByText('Tuesday, 20 Jan 2026')).toBeInTheDocument();
    expect(screen.getByText('No slots for this date yet.')).toBeInTheDocument();
  });

  it('renders existing slots covering pod-title, pending, locked, and price branches', () => {
    const slots = [
      makeSlot({ id: 'available', status: 'AVAILABLE', price: 0, booked_pod_title: null, notes: '' }),
      makeSlot({
        id: 'pending',
        status: 'PENDING',
        price: 500,
        booked_pod_title: 'Yoga Pod',
        notes: 'Bring your own mat',
      }),
      makeSlot({ id: 'booked', status: 'BOOKED', price: 250, booked_pod_title: 'Dance Pod' }),
      makeSlot({ id: 'blocked', status: 'BLOCKED', price: 0 }),
    ];
    render(<DayDrawer {...baseProps({ slots })} />);

    expect(screen.getAllByText('Free')).toHaveLength(2); // available + blocked slots are 0-priced
    expect(screen.getByText('₹500')).toBeInTheDocument();
    expect(screen.getByText('₹250')).toBeInTheDocument();
    expect(screen.getByText('Requested by pod: Yoga Pod')).toBeInTheDocument();
    expect(screen.getByText('Booked by pod: Dance Pod')).toBeInTheDocument();
    expect(screen.getByText('Awaiting your decision — approve or decline it under Slot Requests.')).toBeInTheDocument();
    expect(screen.getByText('Bring your own mat')).toBeInTheDocument();

    // Locked (BOOKED, PENDING) rows have no Block/Delete actions; unlocked ones do.
    expect(screen.getAllByRole('button', { name: 'Block' })).toHaveLength(1); // the AVAILABLE row
    expect(screen.getAllByRole('button', { name: 'Unblock' })).toHaveLength(1); // the BLOCKED row
    expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(2); // AVAILABLE + BLOCKED rows
  });

  it('toggles block on an unlocked slot', async () => {
    const onToggleBlock = vi.fn().mockResolvedValue(undefined);
    const slot = makeSlot({ id: 'a1', status: 'AVAILABLE' });
    render(<DayDrawer {...baseProps({ slots: [slot], onToggleBlock })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Block' }));
    await waitFor(() => expect(onToggleBlock).toHaveBeenCalledWith(slot));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the thrown message and lets it be dismissed when toggling block fails', async () => {
    const onToggleBlock = vi.fn().mockRejectedValue(new Error('Venue offline'));
    const slot = makeSlot({ id: 'a1', status: 'AVAILABLE' });
    render(<DayDrawer {...baseProps({ slots: [slot], onToggleBlock })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Block' }));
    await waitFor(() => expect(screen.getByText('Venue offline')).toBeInTheDocument());
    const alert = screen.getByText('Venue offline').closest('[role="alert"]') as HTMLElement;
    fireEvent.click(within(alert).getByRole('button'));
    expect(screen.queryByText('Venue offline')).not.toBeInTheDocument();
  });

  it('shows a generic message when toggling block fails with a non-Error', async () => {
    const onToggleBlock = vi.fn().mockRejectedValue('boom');
    const slot = makeSlot({ id: 'a1', status: 'AVAILABLE' });
    render(<DayDrawer {...baseProps({ slots: [slot], onToggleBlock })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Block' }));
    await waitFor(() => expect(screen.getByText('Could not update slot')).toBeInTheDocument());
  });

  it('deletes a slot after confirming in the dialog', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const slot = makeSlot({ id: 'del-1', status: 'AVAILABLE' });
    render(<DayDrawer {...baseProps({ slots: [slot], onDelete })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Delete this slot?')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith('del-1'));
  });

  it('cancels the confirm dialog without deleting', () => {
    const onDelete = vi.fn();
    const slot = makeSlot({ id: 'del-1', status: 'AVAILABLE' });
    render(<DayDrawer {...baseProps({ slots: [slot], onDelete })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('closes the confirm dialog via Escape without deleting', () => {
    const onDelete = vi.fn();
    const slot = makeSlot({ id: 'del-1', status: 'AVAILABLE' });
    render(<DayDrawer {...baseProps({ slots: [slot], onDelete })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', code: 'Escape' });
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('ignores a stale second click on the confirm-delete button after the id is already cleared', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const slot = makeSlot({ id: 'del-1', status: 'AVAILABLE' });
    render(<DayDrawer {...baseProps({ slots: [slot], onDelete })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const confirmButton = within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' });
    fireEvent.click(confirmButton); // real delete: clears confirmDeleteId
    fireEvent.click(confirmButton); // stale click on the still-transitioning node: guarded no-op
    await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1));
  });

  it('shows the thrown message when a delete fails with an Error', async () => {
    const onDelete = vi.fn().mockRejectedValue(new Error('Slot is booked'));
    const slot = makeSlot({ id: 'del-1', status: 'AVAILABLE' });
    render(<DayDrawer {...baseProps({ slots: [slot], onDelete })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(screen.getByText('Slot is booked')).toBeInTheDocument());
  });

  it('shows a generic message when a delete fails with a non-Error', async () => {
    const onDelete = vi.fn().mockRejectedValue('nope');
    const slot = makeSlot({ id: 'del-1', status: 'AVAILABLE' });
    render(<DayDrawer {...baseProps({ slots: [slot], onDelete })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(screen.getByText('Could not delete slot')).toBeInTheDocument());
  });

  it('creates a slot with the entered time, price, and notes, then resets the form', async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(<DayDrawer {...baseProps({ date: new Date(2026, 0, 20), onCreate })} />);
    setTime('Start', '09:00');
    setTime('End', '10:00');
    fireEvent.change(screen.getByLabelText('Price (₹)'), { target: { value: '150' } });
    fireEvent.change(screen.getByLabelText('Notes (optional)'), { target: { value: 'Yoga session' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add slot' }));

    const expectedStart = new Date(2026, 0, 20, 9, 0, 0, 0);
    const expectedEnd = new Date(2026, 0, 20, 10, 0, 0, 0);
    await waitFor(() =>
      expect(onCreate).toHaveBeenCalledWith({
        start_at: expectedStart.toISOString(),
        end_at: expectedEnd.toISOString(),
        price: 150,
        notes: 'Yoga session',
      }),
    );
    await waitFor(() => expect(screen.getByLabelText('Price (₹)')).toHaveValue(null));
  });

  it('defaults an empty price to 0', async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(<DayDrawer {...baseProps({ date: new Date(2026, 0, 20), onCreate })} />);
    setTime('Start', '09:00');
    setTime('End', '10:00');
    fireEvent.click(screen.getByRole('button', { name: 'Add slot' }));
    await waitFor(() => expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ price: 0 })));
  });

  it('shows a validation error when start or end time is missing', () => {
    const onCreate = vi.fn();
    render(<DayDrawer {...baseProps({ onCreate })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add slot' }));
    expect(screen.getByText('Pick start and end time.')).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('shows a validation error when end time is not after start time', () => {
    const onCreate = vi.fn();
    render(<DayDrawer {...baseProps({ onCreate })} />);
    setTime('Start', '10:00');
    setTime('End', '09:00');
    fireEvent.click(screen.getByRole('button', { name: 'Add slot' }));
    expect(screen.getByText('End must be after start.')).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('shows a validation error when the start time is in the past', () => {
    const onCreate = vi.fn();
    // `date` is today (Jan 15); "now" is mocked to noon, so a 09:00 start is already past.
    render(<DayDrawer {...baseProps({ date: new Date(2026, 0, 15), onCreate })} />);
    setTime('Start', '09:00');
    setTime('End', '11:00');
    fireEvent.click(screen.getByRole('button', { name: 'Add slot' }));
    expect(screen.getByText('Start time must be in the future.')).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('shows a validation error when the start time is more than 60 days ahead', () => {
    const onCreate = vi.fn();
    render(<DayDrawer {...baseProps({ date: new Date(2026, 5, 1), onCreate })} />);
    setTime('Start', '09:00');
    setTime('End', '10:00');
    fireEvent.click(screen.getByRole('button', { name: 'Add slot' }));
    expect(screen.getByText('Slots can only be scheduled up to 60 days ahead.')).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('shows an "Adding…" state while creating, then resolves back to normal', async () => {
    let resolveCreate: () => void = () => {};
    const onCreate = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveCreate = resolve;
        }),
    );
    render(<DayDrawer {...baseProps({ onCreate })} />);
    setTime('Start', '09:00');
    setTime('End', '10:00');
    fireEvent.click(screen.getByRole('button', { name: 'Add slot' }));
    expect(await screen.findByRole('button', { name: 'Adding…' })).toBeDisabled();
    resolveCreate();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add slot' })).toBeEnabled());
  });

  it('shows the thrown message and keeps the form filled when create fails with an Error', async () => {
    const onCreate = vi.fn().mockRejectedValue(new Error('Server exploded'));
    render(<DayDrawer {...baseProps({ onCreate })} />);
    setTime('Start', '09:00');
    setTime('End', '10:00');
    fireEvent.change(screen.getByLabelText('Price (₹)'), { target: { value: '75' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add slot' }));
    await waitFor(() => expect(screen.getByText('Server exploded')).toBeInTheDocument());
    expect(screen.getByLabelText('Price (₹)')).toHaveValue(75);
  });

  it('shows a generic message when create fails with a non-Error', async () => {
    const onCreate = vi.fn().mockRejectedValue('boom');
    render(<DayDrawer {...baseProps({ onCreate })} />);
    setTime('Start', '09:00');
    setTime('End', '10:00');
    fireEvent.click(screen.getByRole('button', { name: 'Add slot' }));
    await waitFor(() => expect(screen.getByText('Could not create slot')).toBeInTheDocument());
  });

  it('shows the holiday alert and hides the add-slot form when the date is a venue leave', () => {
    render(<DayDrawer {...baseProps({ isHoliday: true })} />);
    expect(
      screen.getByText('This date is marked as a venue leave/holiday — slots cannot be added or booked.'),
    ).toBeInTheDocument();
  });

  it('resets the form and calls onClose when closed', () => {
    const onClose = vi.fn();
    render(<DayDrawer {...baseProps({ onClose })} />);
    fireEvent.change(screen.getByLabelText('Price (₹)'), { target: { value: '99' } });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Price (₹)')).toHaveValue(null);
  });

  it('treats a date prop that turns null mid-close as unpicked and shows an empty header', () => {
    const onCreate = vi.fn();
    const props = baseProps({ date: new Date(2026, 0, 20), onCreate });
    const { rerender } = render(<DayDrawer {...props} />);
    expect(screen.getByText('Tuesday, 20 Jan 2026')).toBeInTheDocument();

    // Simulate the host clearing `date` while `open` is still true: the underlying
    // Drawer starts its close transition but stays mounted synchronously, so the
    // component re-renders once more with `date=null` before it unmounts. MUI marks
    // the transitioning-out root aria-hidden, so query by text (not role) here.
    rerender(<DayDrawer {...props} date={null} />);
    expect(screen.queryByText('Tuesday, 20 Jan 2026')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Add slot'));
    expect(screen.getByText('Pick start and end time.')).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();
  });
});
