import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { format, isValid, parseISO } from 'date-fns';
import PeriodControls from '../../../src/pages/entity-analytics/PeriodControls';
import type { PeriodState } from '../../../src/pages/entity-analytics/period-state';
import { byTestId, click, mount, queryTestId } from '../../dom';
import { act } from 'react';
import { COPY } from '../../mocks/analytics';

/**
 * The MUI X picker needs a locale provider and section-by-section typing that
 * jsdom cannot do; a plain input with the picker's contract (a Date or null in
 * and out, a minDate) stands in, so the control's own rules are what is tested.
 */
vi.mock('@mui/x-date-pickers/DatePicker', () => ({
  DatePicker: ({
    label,
    value,
    onChange,
    minDate,
  }: {
    label: string;
    value: Date | null;
    onChange: (next: Date | null) => void;
    minDate?: Date;
  }) => (
    <div>
      <input
        aria-label={label}
        data-testid={`picker-${label}`}
        data-min={minDate && isValid(minDate) ? ymd(minDate) : ''}
        value={value && isValid(value) ? ymd(value) : ''}
        onChange={(event) => onChange(event.target.value ? parseISO(event.target.value) : null)}
      />
      <button type="button" data-testid={`invalid-${label}`} onClick={() => onChange(new Date(Number.NaN))} />
    </div>
  ),
}));

const ymd = (date: Date) => format(date, 'yyyy-MM-dd');
const base: PeriodState = { days: 30, range: null, compare: 'PREVIOUS', city: 'loc-1' };

const setup = async (value: PeriodState = base) => {
  const onChange = vi.fn();
  await mount(<PeriodControls value={value} onChange={onChange} />);
  return onChange;
};
const type = (id: string, text: string) =>
  act(async () => {
    const input = byTestId(id) as HTMLInputElement;
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    set?.call(input, text);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
const pressed = (id: string) => byTestId(id).getAttribute('aria-pressed');

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 15, 12));
});
afterEach(() => {
  vi.useRealTimers();
});

describe('PeriodControls - rolling periods', () => {
  it('marks the current rolling length and none of the calendar periods', async () => {
    await setup();
    expect(pressed('analytics-period-30')).toBe('true');
    expect(pressed('analytics-period-7')).toBe('false');
    expect(pressed('analytics-period-this-month')).toBe('false');
  });

  it('switches to another rolling length, clearing any range', async () => {
    const onChange = await setup();
    await click(byTestId('analytics-period-90'));
    expect(onChange).toHaveBeenCalledWith({ ...base, days: 90, range: null });
    expect(pressed('analytics-period-90')).toBe('true');
  });

  it('does nothing when the length already chosen is pressed again', async () => {
    const onChange = await setup();
    await click(byTestId('analytics-period-30'));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('PeriodControls - calendar periods', () => {
  it('reports this month so far as a range ending today', async () => {
    const onChange = await setup();
    await click(byTestId('analytics-period-this-month'));
    expect(onChange).toHaveBeenCalledWith({ ...base, range: { from: '2026-10-01', to: '2026-10-15' } });
    expect(pressed('analytics-period-this-month')).toBe('true');
    expect(pressed('analytics-period-30')).toBe('false');
  });

  it('reports last month as the whole previous month', async () => {
    const onChange = await setup();
    await click(byTestId('analytics-period-last-month'));
    expect(onChange).toHaveBeenCalledWith({ ...base, range: { from: '2026-09-01', to: '2026-09-30' } });
  });

  it('does nothing when the calendar period already chosen is pressed again', async () => {
    const onChange = await setup();
    await click(byTestId('analytics-period-last-month'));
    onChange.mockClear();
    await click(byTestId('analytics-period-last-month'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows no picker until Month or Custom is chosen', async () => {
    await setup();
    expect(queryTestId(`picker-${COPY['analytics.page.month']}`)).toBeNull();
    expect(queryTestId(`picker-${COPY['analytics.page.from']}`)).toBeNull();
  });
});

describe('PeriodControls - one month', () => {
  const monthPicker = `picker-${COPY['analytics.page.month']}`;

  it('waits for a month to be picked, then reports that whole month', async () => {
    const onChange = await setup();
    await click(byTestId('analytics-period-month'));
    expect(onChange).not.toHaveBeenCalled();
    expect((byTestId(monthPicker) as HTMLInputElement).value).toBe('');
    await type(monthPicker, '2026-07-10');
    expect(onChange).toHaveBeenCalledWith({ ...base, range: { from: '2026-07-01', to: '2026-07-31' } });
  });

  it('does not reload on a cleared or invalid month', async () => {
    const onChange = await setup();
    await click(byTestId('analytics-period-month'));
    await type(monthPicker, '2026-07-10');
    onChange.mockClear();
    await type(monthPicker, '');
    await click(byTestId(`invalid-${COPY['analytics.page.month']}`));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('PeriodControls - custom range', () => {
  const from = `picker-${COPY['analytics.page.from']}`;
  const to = `picker-${COPY['analytics.page.to']}`;

  it('applies a range only once both ends are valid and in order', async () => {
    const onChange = await setup();
    await click(byTestId('analytics-period-custom'));
    await type(from, '2026-10-05');
    expect(onChange).not.toHaveBeenCalled();
    await type(to, '2026-10-12');
    expect(onChange).toHaveBeenCalledWith({ ...base, range: { from: '2026-10-05', to: '2026-10-12' } });
  });

  it('keeps the To picker from reaching before From', async () => {
    await setup();
    await click(byTestId('analytics-period-custom'));
    expect(byTestId(to).dataset.min).toBe('');
    await type(from, '2026-10-05');
    expect(byTestId(to).dataset.min).toBe('2026-10-05');
  });

  it('does not apply a From that falls after To, nor an invalid or cleared end', async () => {
    const onChange = await setup();
    await click(byTestId('analytics-period-custom'));
    await type(to, '2026-10-12');
    await type(from, '2026-10-20');
    await click(byTestId(`invalid-${COPY['analytics.page.from']}`));
    await click(byTestId(`invalid-${COPY['analytics.page.to']}`));
    await type(to, '');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('opens already in custom mode, prefilled, when a range is in force', async () => {
    await setup({ ...base, range: { from: '2026-09-02', to: '2026-09-09' } });
    expect((byTestId(from) as HTMLInputElement).value).toBe('2026-09-02');
    expect((byTestId(to) as HTMLInputElement).value).toBe('2026-09-09');
    expect(pressed('analytics-period-custom')).toBe('true');
    expect(pressed('analytics-period-30')).toBe('false');
  });
});
