import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AddSlotFields from '../src/DayDrawer/AddSlotFields';
import AddSlotForm from '../src/DayDrawer/AddSlotForm';
import { emptyDraft } from '@duncit/slots';
import type { NewSlotInput } from '../src/types';

// Deterministic stand-ins for the MUI X pickers (see DayDrawer.test.tsx).
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

type Props = Parameters<typeof AddSlotForm>[0];

function renderForm(overrides: Partial<Props> = {}) {
  const props: Props = {
    date: new Date(2026, 0, 20),
    isHoliday: false,
    spaces: [],
    onCreate: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  render(<AddSlotForm {...props} />);
  return props;
}

const setTime = (label: string, hhmm: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value: `2000-01-01T${hhmm}` } });
const setDate = (label: string, ymd: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value: `${ymd}T00:00:00` } });
const addButton = () => screen.getByRole('button', { name: 'Add slot' });
const iso = (y: number, m: number, d: number, h = 0, min = 0, s = 0, ms = 0) =>
  new Date(y, m, d, h, min, s, ms).toISOString();

/** What a Jan 20 09:00–10:00 timed slot on a whole-venue venue is sent as. */
const TIMED_PAYLOAD: NewSlotInput = {
  start_at: iso(2026, 0, 20, 9),
  end_at: iso(2026, 0, 20, 10),
  whole_day: false,
  price: 0,
  notes: '',
  space_label: '',
  capacity: 0,
};
const CONFLICT = { graphQLErrors: [{ extensions: { code: 'CONFLICT' } }] };

describe('AddSlotForm', () => {
  beforeEach(() => {
    // "Now" = Jan 15 2026, 12:00 local; the default date (Jan 20) is comfortably future.
    vi.setSystemTime(new Date(2026, 0, 15, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates a timed slot with the entered times, price and notes, then resets the form', async () => {
    const { onCreate } = renderForm();
    setTime('Start time', '09:00');
    setTime('End time', '10:00');
    fireEvent.change(screen.getByLabelText('Price (₹)'), { target: { value: '150' } });
    fireEvent.change(screen.getByLabelText('Notes (optional)'), { target: { value: 'Yoga session' } });
    fireEvent.click(addButton());
    await waitFor(() =>
      expect(onCreate).toHaveBeenCalledWith({ ...TIMED_PAYLOAD, price: 150, notes: 'Yoga session' }, false),
    );
    await waitFor(() => expect(screen.getByLabelText('Price (₹)')).toHaveValue(null));
    expect(screen.getByLabelText('Start time')).toHaveValue('');
    expect(screen.getByLabelText('Notes (optional)')).toHaveValue('');
  });

  it('defaults an empty price to 0', async () => {
    const { onCreate } = renderForm();
    setTime('Start time', '09:00');
    setTime('End time', '10:00');
    fireEvent.click(addButton());
    await waitFor(() => expect(onCreate).toHaveBeenCalledWith(TIMED_PAYLOAD, false));
  });

  it('only complains about missing times on Add, and that message can be dismissed', () => {
    const { onCreate } = renderForm();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument(); // unfinished is not yet wrong
    fireEvent.click(addButton());
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Pick the start and end time.');
    fireEvent.click(within(alert).getByRole('button'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it.each([
    ['an end before the start', '10:00', '09:00', 'End must be after start.'],
    ['the same start and end', '10:00', '10:00', 'Start and end time cannot be the same.'],
  ])('flags %s live and keeps Add disabled', (_label, start, end, message) => {
    const { onCreate } = renderForm();
    setTime('Start time', start);
    setTime('End time', end);
    expect(screen.getByRole('alert')).toHaveTextContent(message);
    expect(addButton()).toBeDisabled();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('flags a start that has already passed today', () => {
    renderForm({ date: new Date(2026, 0, 15) }); // today; "now" is noon
    setTime('Start time', '09:00');
    setTime('End time', '11:00');
    expect(screen.getByRole('alert')).toHaveTextContent('Start time must be in the future.');
    expect(addButton()).toBeDisabled();
  });

  it('flags a start more than 60 days ahead', () => {
    renderForm({ date: new Date(2026, 5, 1) });
    setTime('Start time', '09:00');
    setTime('End time', '10:00');
    expect(screen.getByRole('alert')).toHaveTextContent('Slots can only be scheduled up to 60 days ahead.');
    expect(addButton()).toBeDisabled();
  });

  it('flags an end date before the start date', () => {
    renderForm();
    setDate('End date', '2026-01-19');
    expect(screen.getByRole('alert')).toHaveTextContent('End date must be on or after the start date.');
    expect(addButton()).toBeDisabled();
  });

  it('stops offering a window that passes while the form sits open', () => {
    vi.useRealTimers(); // drop the Date-only mock so full fake timers can drive the clock tick
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 15, 12, 0, 0));
    renderForm({ date: new Date(2026, 0, 15) });
    setTime('Start time', '12:20');
    setTime('End time', '13:00');
    expect(addButton()).toBeEnabled();
    act(() => {
      vi.advanceTimersByTime(21 * 60_000); // 12:21 — the clock ticks every 30s
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Start time must be in the future.');
    expect(addButton()).toBeDisabled();
  });

  it('shows an "Adding…" state while creating, then resolves back to normal', async () => {
    let resolveCreate: () => void = () => {};
    const onCreate = vi.fn(() => new Promise<void>((resolve) => { resolveCreate = resolve; }));
    renderForm({ onCreate });
    setTime('Start time', '09:00');
    setTime('End time', '10:00');
    fireEvent.click(addButton());
    expect(await screen.findByRole('button', { name: 'Adding…' })).toBeDisabled();
    resolveCreate();
    await waitFor(() => expect(addButton()).toBeEnabled());
  });

  it('shows the thrown message and keeps the form filled when create fails with an Error', async () => {
    renderForm({ onCreate: vi.fn().mockRejectedValue(new Error('Server exploded')) });
    setTime('Start time', '09:00');
    setTime('End time', '10:00');
    fireEvent.change(screen.getByLabelText('Price (₹)'), { target: { value: '75' } });
    fireEvent.click(addButton());
    expect(await screen.findByText('Server exploded')).toBeInTheDocument();
    expect(screen.getByLabelText('Price (₹)')).toHaveValue(75);
    expect(screen.queryByRole('button', { name: 'Overwrite' })).not.toBeInTheDocument();
  });

  it('shows a generic message when create fails with a non-Error', async () => {
    renderForm({ onCreate: vi.fn().mockRejectedValue('boom') });
    setTime('Start time', '09:00');
    setTime('End time', '10:00');
    fireEvent.click(addButton());
    expect(await screen.findByText('Could not create slot')).toBeInTheDocument();
  });

  it('books the whole date range without clocks when Whole day is on, hinting at a multi-day booking', async () => {
    const { onCreate } = renderForm();
    fireEvent.click(screen.getByRole('switch'));
    expect(screen.queryByLabelText('Start time')).not.toBeInTheDocument();
    expect(screen.queryByText(/continuous multi-day booking/)).not.toBeInTheDocument();
    setDate('End date', '2026-01-21');
    expect(screen.getByText(/continuous multi-day booking/)).toBeInTheDocument();
    fireEvent.click(addButton());
    await waitFor(() =>
      expect(onCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          start_at: iso(2026, 0, 20),
          end_at: iso(2026, 0, 21, 23, 59, 59, 999),
          whole_day: true,
        }),
        false,
      ),
    );
  });

  it("starts today's whole-day slot a few minutes from now rather than at a past midnight", async () => {
    const { onCreate } = renderForm({ date: new Date(2026, 0, 15) });
    fireEvent.click(screen.getByRole('switch'));
    expect(addButton()).toBeEnabled();
    fireEvent.click(addButton());
    await waitFor(() =>
      expect(onCreate).toHaveBeenCalledWith(
        expect.objectContaining({ start_at: iso(2026, 0, 15, 12, 5), end_at: iso(2026, 0, 15, 23, 59, 59, 999) }),
        false,
      ),
    );
  });

  it('defaults to the first space, labels each by what it holds, and sends the picked one', async () => {
    const spaces = [
      { label: 'Court 1', capacity: 4 },
      { label: '', capacity: 0 },
    ];
    const { onCreate } = renderForm({ spaces });
    setTime('Start time', '09:00');
    setTime('End time', '10:00');
    fireEvent.click(addButton());
    await waitFor(() =>
      expect(onCreate).toHaveBeenLastCalledWith(
        expect.objectContaining({ space_label: 'Court 1', capacity: 4 }),
        false,
      ),
    );

    fireEvent.mouseDown(screen.getByRole('combobox'));
    expect(screen.getByRole('option', { name: 'Court 1 · holds 4' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: 'Whole venue' }));
    setTime('Start time', '09:00');
    setTime('End time', '10:00');
    fireEvent.click(addButton());
    await waitFor(() =>
      expect(onCreate).toHaveBeenLastCalledWith(expect.objectContaining({ space_label: '', capacity: 0 }), false),
    );
  });

  it('offers a clash back as an overwrite, confirmed before the same payload is re-sent', async () => {
    const onCreate = vi.fn().mockRejectedValueOnce(CONFLICT).mockResolvedValue(undefined);
    renderForm({ onCreate });
    setTime('Start time', '09:00');
    setTime('End time', '10:00');
    fireEvent.click(addButton());
    fireEvent.click(await screen.findByRole('button', { name: 'Overwrite' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Overwrite the existing slot?')).toBeInTheDocument();
    // Cancelling keeps the offer on the alert; nothing is re-sent.
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(onCreate).toHaveBeenCalledTimes(1);

    // The closing dialog still marks the page aria-hidden mid-transition, so query by text.
    fireEvent.click(screen.getByText('Overwrite'));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete and overwrite' }));
    await waitFor(() => expect(onCreate).toHaveBeenLastCalledWith(TIMED_PAYLOAD, true));
    await waitFor(() => expect(screen.getByLabelText('Start time')).toHaveValue(''));
  });

  it('does not offer a second overwrite when the overwrite itself clashes', async () => {
    const onCreate = vi.fn().mockRejectedValueOnce(CONFLICT).mockRejectedValueOnce(CONFLICT);
    renderForm({ onCreate });
    setTime('Start time', '09:00');
    setTime('End time', '10:00');
    fireEvent.click(addButton());
    fireEvent.click(await screen.findByRole('button', { name: 'Overwrite' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete and overwrite' }));
    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Could not create slot')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Overwrite' })).not.toBeInTheDocument();
  });

  it('ignores a stale overwrite confirm once the draft has been re-sent on its own', async () => {
    const onCreate = vi.fn().mockRejectedValueOnce(CONFLICT).mockResolvedValue(undefined);
    renderForm({ onCreate });
    setTime('Start time', '09:00');
    setTime('End time', '10:00');
    fireEvent.click(addButton());
    fireEvent.click(await screen.findByRole('button', { name: 'Overwrite' }));
    // The form behind the modal is still live: a plain Add clears the kept clash.
    fireEvent.click(screen.getByText('Add slot'));
    await waitFor(() => expect(onCreate).toHaveBeenLastCalledWith(TIMED_PAYLOAD, false));
    fireEvent.click(screen.getByText('Delete and overwrite'));
    await waitFor(() => expect(screen.queryByText('Overwrite the existing slot?')).not.toBeInTheDocument());
    expect(onCreate).toHaveBeenCalledTimes(2);
  });

  // Rendered directly: the fields component must also hold up before its parent
  // has resolved a space or while the start date is cleared mid-edit.
  it('renders an unresolved space blank, bounds the end date at now without a start date, and patches a re-picked start', () => {
    const patch = vi.fn();
    render(
      <AddSlotFields
        draft={{ ...emptyDraft(new Date(2026, 0, 20)), startDate: null }}
        patch={patch}
        spaces={[{ label: 'Court 1', capacity: 4 }]}
        activeSpace={undefined}
        now={new Date(2026, 0, 15, 12, 0, 0)}
        maxFutureDays={60}
      />,
    );
    expect(screen.getByRole('combobox')).toHaveTextContent(/^​?$/); // no space resolved yet
    setDate('Start date', '2026-01-21');
    expect(patch).toHaveBeenCalledWith({ startDate: new Date(2026, 0, 21) });
  });
});
