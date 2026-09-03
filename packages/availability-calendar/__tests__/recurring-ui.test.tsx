import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { PreviewSummary } from '@duncit/slots';
import BasicSection from '../src/recurring/BasicSection';
import ConflictModeSection from '../src/recurring/ConflictModeSection';
import DayOfWeekPicker from '../src/recurring/DayOfWeekPicker';
import PreviewBar from '../src/recurring/PreviewBar';
import SpacePricingSection from '../src/recurring/SpacePricingSection';
import TimeSlotsSection from '../src/recurring/TimeSlotsSection';
import { initialRecurringForm, newTimeSlot, type SpaceRow } from '../src/recurring/useRecurringDialog';
import { readVenueSettings } from '@duncit/slots';

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

describe('DayOfWeekPicker', () => {
  it('applies presets and toggles individual days', () => {
    const onChange = vi.fn();
    render(<DayOfWeekPicker value={[0, 1, 2, 3, 4, 5, 6]} onChange={onChange} />);

    fireEvent.click(screen.getByText('All'));
    expect(onChange).toHaveBeenLastCalledWith([0, 1, 2, 3, 4, 5, 6]);
    fireEvent.click(screen.getByText('Weekdays'));
    expect(onChange).toHaveBeenLastCalledWith([1, 2, 3, 4, 5]);
    fireEvent.click(screen.getByText('Weekends'));
    expect(onChange).toHaveBeenLastCalledWith([0, 6]);
  });

  it('toggles a single day off, and back on in weekday order', () => {
    const onChange = vi.fn();
    render(<DayOfWeekPicker value={[0, 1]} onChange={onChange} weeklyOff={[0]} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Sunday' }));
    expect(onChange).toHaveBeenLastCalledWith([1]);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Saturday' }));
    expect(onChange).toHaveBeenLastCalledWith([0, 1, 6]);
    expect(screen.getByText('Sun')).toBeInTheDocument();
  });
});

describe('PreviewBar', () => {
  const summary: PreviewSummary = {
    total: 14,
    bySpace: {
      'Banquet hall': { count: 7, price: 899, capacity: 120 },
      Rooftop: { count: 7, price: 499, capacity: 40 },
    },
    estimatedRevenue: 48378,
    skippedWeeklyOff: 2,
    skippedHolidays: 0,
    skippedPast: 0,
    skippedBeyondCap: 0,
  };

  it('renders the total, per-space breakdown, revenue and skip notice', () => {
    render(<PreviewBar summary={summary} maxAdvanceDays={60} />);
    expect(screen.getByText('14 Slots')).toBeTruthy();
    expect(screen.getByText('₹48,378')).toBeTruthy();
    expect(screen.getByText('Banquet hall')).toBeTruthy();
    expect(screen.getByText('Rooftop')).toBeTruthy();
    expect(screen.getByText('₹899 · cap 120')).toBeTruthy();
    expect(screen.getByText('Auto-skipped: 2 weekly-off')).toBeTruthy();
  });

  it('names every skip reason, and the whole venue when no space is named', () => {
    render(
      <PreviewBar
        summary={{
          total: 1,
          bySpace: { '': { count: 1, price: 0, capacity: 0 } },
          estimatedRevenue: 0,
          skippedWeeklyOff: 1,
          skippedHolidays: 2,
          skippedPast: 3,
          skippedBeyondCap: 4,
        }}
        maxAdvanceDays={30}
      />,
    );
    expect(screen.getByText('Whole venue')).toBeTruthy();
    expect(screen.getByText('Auto-skipped: 1 weekly-off · 2 holiday · 3 past · 4 beyond 30 days')).toBeTruthy();
  });

  it('says nothing about skips when nothing was skipped', () => {
    render(
      <PreviewBar summary={{ ...summary, skippedWeeklyOff: 0 }} maxAdvanceDays={60} />,
    );
    expect(screen.queryByText(/Auto-skipped/)).toBeNull();
  });
});

describe('SpacePricingSection', () => {
  const spaces: SpaceRow[] = [
    { label: 'Banquet hall', capacity: 120, price: '899', enabled: true },
    { label: 'Rooftop', capacity: 40, price: '499', enabled: false },
  ];

  it('prices each space by capacity and toggles inclusion', () => {
    const onChange = vi.fn();
    render(<SpacePricingSection spaces={spaces} onChange={onChange} />);
    expect(screen.getByText('Banquet hall')).toBeTruthy();
    expect(screen.getByText('Capacity 120')).toBeTruthy();
    expect(screen.getByLabelText('Rooftop price')).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Banquet hall price'), { target: { value: '950' } });
    expect(onChange).toHaveBeenLastCalledWith([
      { label: 'Banquet hall', capacity: 120, price: '950', enabled: true },
      { label: 'Rooftop', capacity: 40, price: '499', enabled: false },
    ]);

    fireEvent.click(screen.getByLabelText('Include Banquet hall'));
    expect(onChange).toHaveBeenLastCalledWith([
      { label: 'Banquet hall', capacity: 120, price: '899', enabled: false },
      { label: 'Rooftop', capacity: 40, price: '499', enabled: false },
    ]);
  });

  it('shows a single whole-venue row without an include toggle', () => {
    render(<SpacePricingSection spaces={[{ label: '', capacity: 30, price: '399', enabled: true }]} onChange={vi.fn()} />);
    expect(screen.getByText('Whole venue')).toBeTruthy();
    expect(screen.queryByLabelText('Include Whole venue')).toBeNull();
    expect(screen.getByLabelText('Whole venue price')).toBeEnabled();
  });
});

describe('TimeSlotsSection', () => {
  const hours = { open: '09:00', close: '23:00' };

  it('labels a single range plainly and refuses to remove the last one', () => {
    const onChange = vi.fn();
    const rows = [newTimeSlot('13:00', '14:00')];
    render(<TimeSlotsSection timeSlots={rows} onChange={onChange} openHours={hours} bufferMinutes={0} />);
    expect(screen.getByLabelText('Start')).toBeInTheDocument();
    expect(screen.getByLabelText('End')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove time slot 1' })).toBeDisabled();
    expect(screen.getByText('Venue hours 09:00–23:00. Slots must not overlap.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add time slot' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toHaveLength(2);

    fireEvent.change(screen.getByLabelText('End'), { target: { value: '2000-01-01T15:30' } });
    expect(onChange.mock.calls[1][0][0].end).toEqual(new Date('2000-01-01T15:30'));
  });

  it('numbers the starts, removes a row, and states the venue buffer', () => {
    const onChange = vi.fn();
    const rows = [newTimeSlot('13:00', '14:00'), newTimeSlot('15:00', '16:00')];
    render(<TimeSlotsSection timeSlots={rows} onChange={onChange} openHours={hours} bufferMinutes={15} />);
    expect(screen.getByLabelText('Start #1')).toBeInTheDocument();
    expect(screen.getByLabelText('Start #2')).toBeInTheDocument();
    expect(screen.getByText('Venue hours 09:00–23:00. Keep a 15-min gap between slots.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Start #2'), { target: { value: '2000-01-01T15:15' } });
    expect(onChange.mock.calls[0][0][1].start).toEqual(new Date('2000-01-01T15:15'));
    expect(onChange.mock.calls[0][0][0]).toBe(rows[0]);

    fireEvent.click(screen.getByRole('button', { name: 'Remove time slot 2' }));
    expect(onChange).toHaveBeenLastCalledWith([rows[0]]);
  });
});

describe('ConflictModeSection', () => {
  it('offers Skip and Overwrite, and warns only once Overwrite is picked', () => {
    const onChange = vi.fn();
    const { rerender } = render(<ConflictModeSection value="SKIP" onChange={onChange} />);
    expect(screen.queryByText(/Overwriting permanently deletes/)).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: /Overwrite the existing slot/ }));
    expect(onChange).toHaveBeenCalledWith('REPLACE');

    rerender(<ConflictModeSection value="REPLACE" onChange={onChange} />);
    expect(screen.getByText(/Overwriting permanently deletes/)).toBeInTheDocument();
  });
});

describe('BasicSection', () => {
  const settings = readVenueSettings({ weekly_off_days: [0], rules: { buffer_minutes: 0, max_advance_days: 60 } });
  const spaces: SpaceRow[] = [{ label: 'Hall', capacity: 50, price: '399', enabled: true }];

  it('patches the dates, weekdays, whole-day switch, spaces and conflict mode', () => {
    const patch = vi.fn();
    render(<BasicSection form={initialRecurringForm(spaces)} patch={patch} settings={settings} />);
    expect(screen.getByText('Time slots')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2030-01-20T00:00:00' } });
    expect(patch).toHaveBeenLastCalledWith({ startDate: new Date('2030-01-20T00:00:00') });
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2030-01-21T00:00:00' } });
    expect(patch).toHaveBeenLastCalledWith({ endDate: new Date('2030-01-21T00:00:00') });
    fireEvent.click(screen.getByText('Weekdays'));
    expect(patch).toHaveBeenLastCalledWith({ weekdays: [1, 2, 3, 4, 5] });
    fireEvent.click(screen.getByRole('switch'));
    expect(patch).toHaveBeenLastCalledWith({ wholeDay: true });
    fireEvent.change(screen.getByLabelText('Hall price'), { target: { value: '450' } });
    expect(patch).toHaveBeenLastCalledWith({ spaces: [{ label: 'Hall', capacity: 50, price: '450', enabled: true }] });
    fireEvent.click(screen.getByRole('radio', { name: /Overwrite the existing slot/ }));
    expect(patch).toHaveBeenLastCalledWith({ conflictMode: 'REPLACE' });
    fireEvent.click(screen.getByRole('button', { name: 'Add time slot' }));
    expect(patch.mock.calls.at(-1)?.[0].timeSlots).toHaveLength(2);
  });

  it('hides the time ranges once whole day is on and bounds the end date by the start', () => {
    const form = { ...initialRecurringForm(spaces), wholeDay: true, startDate: new Date('2030-01-20T00:00:00') };
    render(<BasicSection form={form} patch={vi.fn()} settings={settings} />);
    expect(screen.queryByText('Time slots')).toBeNull();
    expect(screen.getByLabelText('Start date')).toHaveValue(new Date('2030-01-20T00:00:00').toISOString());
  });
});
