import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { formatDate, formatDateTime, formatTime } from '@duncit/datetime';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DayDrawer from '../src/DayDrawer';
import { makeSlot } from './fixtures';

// Deterministic stand-ins for the MUI X pickers: plain inputs whose value is
// parsed as a local date-time string, so onChange fires with a real Date or
// null without wrestling the real pickers' popup/keyboard interaction (and
// their LocalizationProvider requirement) under jsdom.
vi.mock('@mui/x-date-pickers/DatePicker', () => ({
  DatePicker: ({ label, value, onChange }: { label: string; value: Date | null; onChange: (v: Date | null) => void }) => (
    <input
      aria-label={label}
      value={value ? value.toISOString() : ''}
      onChange={(e) => onChange(e.target.value ? new Date(e.target.value) : null)}
    />
  ),
}));
vi.mock('@mui/x-date-pickers/TimePicker', () => ({
  TimePicker: ({ label, value, onChange }: { label: string; value: Date | null; onChange: (v: Date | null) => void }) => (
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

const iso = (y: number, m: number, d: number, h = 0, min = 0, s = 0, ms = 0) =>
  new Date(y, m, d, h, min, s, ms).toISOString();

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

  it('shows the admin-format date header and an empty-state message with no slots', () => {
    render(<DayDrawer {...baseProps({ slots: [] })} />);
    // The header reads the admin's date pattern (fallback 'dd MMM yyyy'), not a local literal.
    expect(screen.getByText('20 Jan 2026')).toBeInTheDocument();
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

  it('labels timed, multi-day and whole-day slots, and names the space each one is for', () => {
    const timed = makeSlot({ id: 'timed', start_at: iso(2026, 0, 20, 9), end_at: iso(2026, 0, 20, 10) });
    const timedMulti = makeSlot({ id: 'multi', start_at: iso(2026, 0, 20, 10), end_at: iso(2026, 0, 22, 18) });
    const wholeSingle = makeSlot({
      id: 'whole',
      whole_day: true,
      start_at: iso(2026, 0, 20),
      end_at: iso(2026, 0, 20, 23, 59, 59, 999),
      space_label: 'Court 1',
      capacity: 4,
    });
    const wholeMulti = makeSlot({
      id: 'whole-multi',
      whole_day: true,
      start_at: iso(2026, 0, 20),
      end_at: iso(2026, 0, 21, 23, 59, 59, 999),
      space_label: 'Hall',
      capacity: 0,
    });
    render(<DayDrawer {...baseProps({ slots: [timed, timedMulti, wholeSingle, wholeMulti] })} />);

    const s = (slot: { start_at: string }) => new Date(slot.start_at);
    const e = (slot: { end_at: string }) => new Date(slot.end_at);
    expect(screen.getByText(`${formatTime(s(timed))} – ${formatTime(e(timed))}`)).toBeInTheDocument();
    expect(
      screen.getByText(`${formatDateTime(s(timedMulti))} – ${formatDateTime(e(timedMulti))}`),
    ).toBeInTheDocument();
    // Two 'Whole day' texts: the single-day whole-day slot's label + the add-form toggle below.
    expect(screen.getAllByText('Whole day')).toHaveLength(2);
    expect(
      screen.getByText(`Whole day · ${formatDate(s(wholeMulti))} – ${formatDate(e(wholeMulti))}`),
    ).toBeInTheDocument();
    // A space with a capacity says how many it holds; a 0-capacity space is just its name.
    expect(screen.getByText('Court 1 · holds 4')).toBeInTheDocument();
    expect(screen.getByText('Hall')).toBeInTheDocument();
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
    const alert = (await screen.findByText('Venue offline')).closest('[role="alert"]') as HTMLElement;
    fireEvent.click(within(alert).getByRole('button'));
    expect(screen.queryByText('Venue offline')).not.toBeInTheDocument();
  });

  it('shows a generic message when toggling block fails with a non-Error', async () => {
    const onToggleBlock = vi.fn().mockRejectedValue('boom');
    const slot = makeSlot({ id: 'a1', status: 'AVAILABLE' });
    render(<DayDrawer {...baseProps({ slots: [slot], onToggleBlock })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Block' }));
    expect(await screen.findByText('Could not update slot')).toBeInTheDocument();
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
    expect(await screen.findByText('Slot is booked')).toBeInTheDocument();
  });

  it('shows a generic message when a delete fails with a non-Error', async () => {
    const onDelete = vi.fn().mockRejectedValue('nope');
    const slot = makeSlot({ id: 'del-1', status: 'AVAILABLE' });
    render(<DayDrawer {...baseProps({ slots: [slot], onDelete })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('Could not delete slot')).toBeInTheDocument();
  });

  it('seeds the add form with the drawer date and hands the create through with overwrite=false', async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(<DayDrawer {...baseProps({ date: new Date(2026, 0, 20), onCreate })} />);
    expect(screen.getByLabelText('Start date')).toHaveValue(iso(2026, 0, 20));
    expect(screen.getByLabelText('End date')).toHaveValue(iso(2026, 0, 20));
    fireEvent.change(screen.getByLabelText('Start time'), { target: { value: '2000-01-01T09:00' } });
    fireEvent.change(screen.getByLabelText('End time'), { target: { value: '2000-01-01T10:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add slot' }));
    await waitFor(() =>
      expect(onCreate).toHaveBeenCalledWith(
        expect.objectContaining({ start_at: iso(2026, 0, 20, 9), end_at: iso(2026, 0, 20, 10) }),
        false,
      ),
    );
  });

  it('shows the holiday alert and hides the add-slot form when the date is a venue leave', () => {
    render(<DayDrawer {...baseProps({ isHoliday: true })} />);
    expect(
      screen.getByText('This date is marked as a venue leave/holiday — slots cannot be added or booked.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Add slot')).not.toBeVisible();
  });

  it('calls onClose from the header close button', () => {
    const onClose = vi.fn();
    render(<DayDrawer {...baseProps({ onClose })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('treats a date prop that turns null mid-close as unpicked: empty header, no add form', () => {
    const props = baseProps({ date: new Date(2026, 0, 20) });
    const { rerender } = render(<DayDrawer {...props} />);
    expect(screen.getByText('20 Jan 2026')).toBeInTheDocument();
    expect(screen.getByText('Add slot')).toBeInTheDocument();

    // Simulate the host clearing `date` while `open` is still true: the underlying
    // Drawer starts its close transition but stays mounted synchronously, so the
    // component re-renders once more with `date=null` before it unmounts. MUI marks
    // the transitioning-out root aria-hidden, so query by text (not role) here.
    rerender(<DayDrawer {...props} date={null} />);
    expect(screen.queryByText('20 Jan 2026')).not.toBeInTheDocument();
    expect(screen.queryByText('Add slot')).not.toBeInTheDocument();
  });
});
