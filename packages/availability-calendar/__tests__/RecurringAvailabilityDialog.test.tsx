import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { format } from 'date-fns';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RecurringAvailabilityDialog from '../src/RecurringAvailabilityDialog';
import type { NewSlotInput } from '../src/types';

// Deterministic stand-ins for the MUI X pickers: plain inputs whose value is parsed
// as a local date-time string, so onChange fires with a real Date or null without
// wrestling the real pickers' popup/keyboard interaction under jsdom.
vi.mock('@mui/x-date-pickers/DatePicker', () => ({
  DatePicker: ({
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

function setDate(label: string, y: number, m: number, d: number) {
  const value = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T00:00:00`;
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function setTime(label: string, hhmm: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value: `2000-01-01T${hhmm}` } });
}

function renderDialog(onAdd = vi.fn().mockResolvedValue(undefined), onClose = vi.fn()) {
  render(<RecurringAvailabilityDialog open onClose={onClose} onAdd={onAdd} />);
  return { onAdd, onClose };
}

describe('RecurringAvailabilityDialog', () => {
  beforeEach(() => {
    // "Now" = Jan 15 2026, 12:00 local, unless a test overrides it.
    vi.setSystemTime(new Date(2026, 0, 15, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a validation error when required fields are missing', () => {
    const { onAdd } = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Add to calendar' }));
    expect(screen.getByText('Pick the dates and the daily times.')).toBeInTheDocument();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('shows a validation error when the end date is before the start date', () => {
    const { onAdd } = renderDialog();
    setDate('Start date', 2026, 1, 20);
    setDate('End date', 2026, 1, 15);
    setTime('Daily start', '09:00');
    setTime('Daily end', '10:00');
    fireEvent.click(screen.getByRole('button', { name: 'Add to calendar' }));
    expect(screen.getByText('End date must be on or after the start date.')).toBeInTheDocument();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('shows a validation error when the daily end time is not after the start time', () => {
    const { onAdd } = renderDialog();
    setDate('Start date', 2026, 1, 20);
    setDate('End date', 2026, 1, 20);
    setTime('Daily start', '10:00');
    setTime('Daily end', '09:00');
    fireEvent.click(screen.getByRole('button', { name: 'Add to calendar' }));
    expect(screen.getByText('Daily end time must be after the start time.')).toBeInTheDocument();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('shows an error when a valid single-day range has no upcoming slots', () => {
    const { onAdd } = renderDialog();
    // Today (Jan 15) with a 9am window, but "now" is mocked to noon: already past.
    setDate('Start date', 2026, 1, 15);
    setDate('End date', 2026, 1, 15);
    setTime('Daily start', '09:00');
    setTime('Daily end', '10:00');
    fireEvent.click(screen.getByRole('button', { name: 'Add to calendar' }));
    expect(screen.getByText('That range has no upcoming slots.')).toBeInTheDocument();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('builds one slot per upcoming day, skipping a day whose window has already passed, and resets on success', async () => {
    const { onAdd, onClose } = renderDialog();
    setDate('Start date', 2026, 1, 15); // today: 9am window already past "now" (noon) -> skipped
    setDate('End date', 2026, 1, 18);
    setTime('Daily start', '09:00');
    setTime('Daily end', '10:00');
    fireEvent.change(screen.getByLabelText('Price (₹)'), { target: { value: '200' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add to calendar' }));

    const expected: NewSlotInput[] = [16, 17, 18].map((d) => ({
      start_at: new Date(2026, 0, d, 9, 0, 0, 0).toISOString(),
      end_at: new Date(2026, 0, d, 10, 0, 0, 0).toISOString(),
      price: 200,
      notes: '',
    }));
    await waitFor(() => expect(onAdd).toHaveBeenCalledWith(expected));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText('Start date')).toHaveValue('');
  });

  it('defaults an empty price to 0 and skips days beyond the 60-day cap while keeping days within it', async () => {
    vi.setSystemTime(new Date(2026, 0, 1, 0, 0, 0)); // now = Jan 1 2026 00:00; cap = Mar 2 2026 00:00
    const { onAdd } = renderDialog();
    setDate('Start date', 2026, 1, 1);
    setDate('End date', 2026, 3, 3);
    setTime('Daily start', '01:00');
    setTime('Daily end', '02:00');
    fireEvent.click(screen.getByRole('button', { name: 'Add to calendar' }));

    await waitFor(() => expect(onAdd).toHaveBeenCalledTimes(1));
    const slots = onAdd.mock.calls[0][0] as NewSlotInput[];
    const days = slots.map((s) => format(new Date(s.start_at), 'yyyy-MM-dd'));
    expect(days).toHaveLength(60); // Jan 1 .. Mar 1 inclusive; Mar 2-3 fall past the cap
    expect(days[0]).toBe('2026-01-01');
    expect(days[days.length - 1]).toBe('2026-03-01');
    expect(days).not.toContain('2026-03-02');
    expect(slots.every((s) => s.price === 0)).toBe(true);
  });

  it('resets the fields and calls onClose when cancelled', () => {
    const { onClose } = renderDialog();
    setDate('Start date', 2026, 1, 20);
    fireEvent.change(screen.getByLabelText('Price (₹)'), { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Start date')).toHaveValue('');
  });

  it('shows the thrown message and keeps the dialog open when adding fails with an Error', async () => {
    const onAdd = vi.fn().mockRejectedValue(new Error('Network drop'));
    const { onClose } = renderDialog(onAdd);
    setDate('Start date', 2026, 1, 20);
    setDate('End date', 2026, 1, 20);
    setTime('Daily start', '09:00');
    setTime('Daily end', '10:00');
    fireEvent.click(screen.getByRole('button', { name: 'Add to calendar' }));
    await waitFor(() => expect(screen.getByText('Network drop')).toBeInTheDocument());
    expect(onClose).not.toHaveBeenCalled();

    const alert = screen.getByText('Network drop').closest('[role="alert"]') as HTMLElement;
    fireEvent.click(within(alert).getByRole('button'));
    expect(screen.queryByText('Network drop')).not.toBeInTheDocument();
  });

  it('shows a generic message when adding fails with a non-Error', async () => {
    const onAdd = vi.fn().mockRejectedValue('boom');
    renderDialog(onAdd);
    setDate('Start date', 2026, 1, 20);
    setDate('End date', 2026, 1, 20);
    setTime('Daily start', '09:00');
    setTime('Daily end', '10:00');
    fireEvent.click(screen.getByRole('button', { name: 'Add to calendar' }));
    await waitFor(() => expect(screen.getByText('Could not add slots')).toBeInTheDocument());
  });

  it('shows an "Adding…" state while saving, then resolves back to normal', async () => {
    let resolveAdd: () => void = () => {};
    const onAdd = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveAdd = resolve;
        }),
    );
    renderDialog(onAdd);
    setDate('Start date', 2026, 1, 20);
    setDate('End date', 2026, 1, 20);
    setTime('Daily start', '09:00');
    setTime('Daily end', '10:00');
    fireEvent.click(screen.getByRole('button', { name: 'Add to calendar' }));
    expect(await screen.findByRole('button', { name: 'Adding…' })).toBeDisabled();
    resolveAdd();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add to calendar' })).toBeEnabled());
  });
});
