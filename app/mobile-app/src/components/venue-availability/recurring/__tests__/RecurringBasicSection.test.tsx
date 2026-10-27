import { fireEvent, screen } from '@testing-library/react-native';
import type { VenueSettingsView } from '@duncit/slots';

import { renderWithProviders } from '@/utils/test-utils';
import type { RecurringForm } from '../recurring-form';
import { RecurringBasicSection } from '../RecurringBasicSection';

const NOW = new Date(2030, 0, 9, 10, 0);

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
    options?.vars ? `${key}|${Object.values(options.vars).join(',')}` : key;
  return { useTranslation: () => ({ t }) };
});
jest.mock('@/utils/app-formatter', () => ({
  ...jest.requireActual('@/utils/app-formatter'),
  appNow: () => new Date(2030, 0, 9, 10, 0),
}));

const mockPickers: Record<string, Record<string, unknown>> = {};
jest.mock('@/components/venue-availability/DateTimePickerField', () => ({
  DateTimePickerField: (props: { testID: string; onChange: (d: Date) => void }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pressable } = require('react-native');
    mockPickers[props.testID] = props;
    return <Pressable testID={props.testID} onPress={() => props.onChange(new Date(2030, 1, 1))} />;
  },
}));
const mockOthers: Record<string, Record<string, unknown>> = {};
const other = (name: string) =>
  function Other(props: Record<string, unknown>) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pressable } = require('react-native');
    mockOthers[name] = props;
    return (
      <Pressable
        testID={`stub-${name}`}
        onPress={() => (props.onChange as (v: unknown) => void)(`${name}-changed`)}
      />
    );
  };
jest.mock('../WeekdayChips', () => ({
  WeekdayChips: (p: Record<string, unknown>) => other('weekdays')(p),
}));
jest.mock('../TimeRangesSection', () => ({
  TimeRangesSection: (p: Record<string, unknown>) => other('ranges')(p),
}));
jest.mock('../SpacePricingSection', () => ({
  SpacePricingSection: (p: Record<string, unknown>) => other('spaces')(p),
}));
jest.mock('../ConflictModeSection', () => ({
  ConflictModeSection: (p: Record<string, unknown>) => other('conflict')(p),
}));

const settings = (maxAdvance = 30) =>
  ({
    rules: { max_advance_days: maxAdvance, buffer_minutes: 10 },
    weekly_off_days: [0],
    operating_hours: { open: '08:00', close: '22:00' },
  }) as unknown as VenueSettingsView;

const formOf = (patch: Partial<RecurringForm> = {}): RecurringForm => ({
  startDate: null,
  endDate: null,
  weekdays: [1, 2],
  wholeDay: false,
  timeSlots: [{ id: 'a', start: '10:00', end: '11:00' }],
  spaces: [{ label: '', capacity: 10, price: '399', enabled: true }],
  skipWeeklyOff: true,
  skipHolidays: true,
  conflictMode: 'SKIP',
  ...patch,
});

const mount = (form = formOf(), maxAdvance = 30) => {
  const patch = jest.fn();
  renderWithProviders(
    <RecurringBasicSection form={form} patch={patch} settings={settings(maxAdvance)} />,
  );
  return patch;
};

beforeEach(() => jest.clearAllMocks());

describe('RecurringBasicSection', () => {
  it('patches the start and end dates as they are picked', () => {
    const patch = mount();
    fireEvent.press(screen.getByTestId('recurring-start-date'));
    fireEvent.press(screen.getByTestId('recurring-end-date'));
    expect(patch).toHaveBeenNthCalledWith(1, { startDate: new Date(2030, 1, 1) });
    expect(patch).toHaveBeenNthCalledWith(2, { endDate: new Date(2030, 1, 1) });
  });

  it('bounds the start by now and the end by the start date, or now when none is picked', () => {
    mount();
    expect(mockPickers['recurring-start-date']?.minDateTime).toEqual(NOW);
    expect(mockPickers['recurring-end-date']?.minDateTime).toEqual(NOW);
    const start = new Date(2030, 0, 20);
    mount(formOf({ startDate: start }));
    expect(mockPickers['recurring-end-date']?.minDateTime).toBe(start);
  });

  it('says how far ahead the venue allows, only when the end date reaches past it', () => {
    mount(formOf({ endDate: new Date(2030, 0, 9 + 31, 10, 1) }), 30);
    expect(mockPickers['recurring-end-date']?.hint).toBe('availability.maxAhead|30');
  });

  it('gives no hint for an end date inside the limit, on its edge, or not picked', () => {
    mount(formOf({ endDate: new Date(2030, 0, 9 + 30, 10, 0) }), 30);
    expect(mockPickers['recurring-end-date']?.hint).toBeUndefined();
    mount(formOf({ endDate: new Date(2030, 0, 15) }), 30);
    expect(mockPickers['recurring-end-date']?.hint).toBeUndefined();
    mount(formOf(), 30);
    expect(mockPickers['recurring-end-date']?.hint).toBeUndefined();
  });

  it('hands the weekdays the form days and the venue closed days', () => {
    const patch = mount();
    expect(mockOthers.weekdays).toMatchObject({ value: [1, 2], weeklyOff: [0] });
    fireEvent.press(screen.getByTestId('stub-weekdays'));
    expect(patch).toHaveBeenCalledWith({ weekdays: 'weekdays-changed' });
  });

  it('shows the daily windows with the venue hours and buffer, unless the run is whole days', () => {
    const patch = mount();
    expect(mockOthers.ranges).toMatchObject({
      timeSlots: [{ id: 'a', start: '10:00', end: '11:00' }],
      openHours: { open: '08:00', close: '22:00' },
      bufferMinutes: 10,
    });
    fireEvent.press(screen.getByTestId('stub-ranges'));
    expect(patch).toHaveBeenCalledWith({ timeSlots: 'ranges-changed' });
  });

  it('hides the daily windows for a whole-day run', () => {
    mount(formOf({ wholeDay: true }));
    expect(screen.queryByTestId('stub-ranges')).toBeNull();
  });

  it('turns whole-day on and off', () => {
    const patch = mount();
    fireEvent(screen.getByTestId('recurring-whole-day-switch'), 'valueChange', true);
    expect(patch).toHaveBeenCalledWith({ wholeDay: true });
    expect(screen.getByTestId('recurring-whole-day-switch').props.value).toBe(false);
  });

  it('patches the space prices and the clash mode', () => {
    const patch = mount();
    expect(mockOthers.spaces?.spaces).toEqual(formOf().spaces);
    expect(mockOthers.conflict?.value).toBe('SKIP');
    fireEvent.press(screen.getByTestId('stub-spaces'));
    fireEvent.press(screen.getByTestId('stub-conflict'));
    expect(patch).toHaveBeenNthCalledWith(1, { spaces: 'spaces-changed' });
    expect(patch).toHaveBeenNthCalledWith(2, { conflictMode: 'conflict-changed' });
  });
});
