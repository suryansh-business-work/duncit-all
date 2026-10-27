import { fireEvent, screen } from '@testing-library/react-native';
import { emptyDraft, type SlotDraft } from '@duncit/slots';

import { renderWithProviders } from '@/utils/test-utils';
import { AddSlotFields, type VenueSpace } from '../AddSlotFields';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
    options?.vars ? `${key}|${Object.values(options.vars).join(',')}` : key;
  return { useTranslation: () => ({ t }) };
});
const mockPickers: Record<string, Record<string, unknown>> = {};
jest.mock('@/components/venue-availability/DateTimePickerField', () => ({
  DateTimePickerField: (props: { testID: string; onChange: (d: Date) => void }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pressable } = require('react-native');
    mockPickers[props.testID] = props;
    return (
      <Pressable
        testID={props.testID}
        onPress={() => props.onChange(new Date(2031, 1, 5, 17, 45))}
      />
    );
  },
}));
jest.mock('@/components/venue-availability/SlotPricingFields', () => ({
  SlotPricingFields: () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text } = require('react-native');
    return <Text testID="pricing-stub">pricing</Text>;
  },
}));

const NOW = new Date(2030, 0, 9, 9, 0);
const SPACES: VenueSpace[] = [
  { label: 'Court 1', capacity: 4 },
  { label: 'Court 2', capacity: 8 },
];

const mount = (
  draftPatch: Partial<SlotDraft> = {},
  { spaces = [] as VenueSpace[], activeSpace = undefined as VenueSpace | undefined } = {},
) => {
  const patch = jest.fn();
  const draft = { ...emptyDraft(new Date(2030, 0, 9)), ...draftPatch };
  renderWithProviders(
    <AddSlotFields
      draft={draft}
      patch={patch}
      spaces={spaces}
      activeSpace={activeSpace}
      now={NOW}
    />,
  );
  return { patch, draft };
};

beforeEach(() => jest.clearAllMocks());

describe('AddSlotFields', () => {
  it('shows the whole-day switch as the draft has it and patches it', () => {
    const { patch } = mount();
    expect(screen.getByTestId('add-slot-whole-day-switch').props.value).toBe(false);
    fireEvent(screen.getByTestId('add-slot-whole-day-switch'), 'valueChange', true);
    expect(patch).toHaveBeenCalledWith({ wholeDay: true });
  });

  it('shows the notes as typed, capped at 280 characters, and patches them', () => {
    const { patch } = mount({ notes: 'Bring shoes' });
    const notes = screen.getByTestId('field-add-slot-notes');
    expect(notes.props.value).toBe('Bring shoes');
    expect(notes.props.maxLength).toBe(280);
    fireEvent.changeText(notes, 'Bring shoes and a towel');
    expect(patch).toHaveBeenCalledWith({ notes: 'Bring shoes and a towel' });
  });

  it('includes the pricing fields', () => {
    mount();
    expect(screen.getByTestId('pricing-stub')).toBeOnTheScreen();
  });
});

describe('AddSlotFields — spaces', () => {
  it('has no space picker for a venue that sells as one whole venue', () => {
    mount();
    expect(screen.queryByTestId('add-slot-space-Court 1')).toBeNull();
  });

  it('lists the spaces with their capacity and marks the active one', () => {
    mount({}, { spaces: SPACES, activeSpace: SPACES[1] });
    expect(screen.getByLabelText('availability.spaceHolds|Court 1,4')).toBeOnTheScreen();
    expect(screen.getByTestId('add-slot-space-Court 2').props['aria-checked']).toBe(true);
    expect(screen.getByTestId('add-slot-space-Court 1').props['aria-checked']).toBe(false);
  });

  it('marks no space when none is active', () => {
    mount({}, { spaces: SPACES });
    expect(screen.getByTestId('add-slot-space-Court 1').props['aria-checked']).toBe(false);
    expect(screen.getByTestId('add-slot-space-Court 2').props['aria-checked']).toBe(false);
  });

  it('patches the space that was picked', () => {
    const { patch } = mount({}, { spaces: SPACES, activeSpace: SPACES[0] });
    fireEvent.press(screen.getByTestId('add-slot-space-Court 2'));
    expect(patch).toHaveBeenCalledWith({ spaceLabel: 'Court 2' });
  });
});

describe('AddSlotFields — dates and times', () => {
  it('asks for a time with each date, bounded by now and by the start', () => {
    const start = new Date(2030, 0, 10, 8, 0);
    mount({ startDate: start });
    expect(mockPickers['add-slot-start']).toMatchObject({ withTime: true, minDateTime: NOW });
    expect(mockPickers['add-slot-end']).toMatchObject({ withTime: true, minDateTime: start });
  });

  it('bounds the end by now until a start is picked', () => {
    mount({ startDate: null });
    expect(mockPickers['add-slot-end']?.minDateTime).toBe(NOW);
  });

  it('asks for dates only on a whole-day slot', () => {
    mount({ wholeDay: true });
    expect(mockPickers['add-slot-start']?.withTime).toBe(false);
    expect(mockPickers['add-slot-end']?.withTime).toBe(false);
  });

  it('a picked start lands in both the date and time halves of the draft', () => {
    const { patch } = mount();
    fireEvent.press(screen.getByTestId('add-slot-start'));
    const picked = new Date(2031, 1, 5, 17, 45);
    expect(patch).toHaveBeenCalledWith({ startDate: picked, startTime: picked });
  });

  it('a picked end lands in both halves too', () => {
    const { patch } = mount();
    fireEvent.press(screen.getByTestId('add-slot-end'));
    const picked = new Date(2031, 1, 5, 17, 45);
    expect(patch).toHaveBeenCalledWith({ endDate: picked, endTime: picked });
  });

  it('a whole-day pick sets the date only, leaving the times untouched', () => {
    const { patch } = mount({ wholeDay: true });
    fireEvent.press(screen.getByTestId('add-slot-start'));
    fireEvent.press(screen.getByTestId('add-slot-end'));
    const picked = new Date(2031, 1, 5, 17, 45);
    expect(patch).toHaveBeenNthCalledWith(1, { startDate: picked });
    expect(patch).toHaveBeenNthCalledWith(2, { endDate: picked });
  });

  it('says the slot spans several days when the end day is after the start day', () => {
    mount({ startDate: new Date(2030, 0, 9, 22, 0), endDate: new Date(2030, 0, 10, 2, 0) });
    expect(screen.getByTestId('add-slot-multi-day')).toHaveTextContent('availability.multiDayHint');
  });

  it('says nothing about days for a slot within one day, or before both dates are picked', () => {
    mount({ startDate: new Date(2030, 0, 9, 10, 0), endDate: new Date(2030, 0, 9, 23, 0) });
    expect(screen.queryByTestId('add-slot-multi-day')).toBeNull();
  });

  it('says nothing about days without an end date', () => {
    mount({ startDate: new Date(2030, 0, 9, 10, 0), endDate: null });
    expect(screen.queryByTestId('add-slot-multi-day')).toBeNull();
  });

  it('says nothing about days without a start date', () => {
    mount({ startDate: null, endDate: new Date(2030, 0, 12) });
    expect(screen.queryByTestId('add-slot-multi-day')).toBeNull();
  });
});
