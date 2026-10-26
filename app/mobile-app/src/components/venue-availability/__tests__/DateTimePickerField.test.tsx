import { act, fireEvent, screen, userEvent, waitFor } from '@testing-library/react-native';

import { renderWithProviders } from '@/utils/test-utils';
import { DateTimePickerField } from '../DateTimePickerField';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});
jest.mock('@/hooks/useDateFormat', () => ({
  useDateFormat: () => ({
    formatDate: (value: Date) =>
      `date:${value.getFullYear()}-${value.getMonth() + 1}-${value.getDate()}`,
    formatDateTime: (value: Date) => `datetime:${value.getHours()}:${value.getMinutes()}`,
  }),
}));
const mockSheet = jest.fn();
jest.mock('@/components/create-pod/DateTimeSheet', () => ({
  CalendarSheet: (props: { onDone: (picked: Date) => void }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pressable } = require('react-native');
    mockSheet(props);
    return (
      <Pressable
        testID="calendar-done"
        onPress={() => props.onDone(new Date(2031, 1, 5, 17, 45))}
      />
    );
  },
}));

const mount = (props: Partial<React.ComponentProps<typeof DateTimePickerField>> = {}) => {
  const onChange = jest.fn();
  renderWithProviders(
    <DateTimePickerField
      label="Start date"
      value={null}
      onChange={onChange}
      testID="dp"
      {...props}
    />,
  );
  return onChange;
};

const open = () => fireEvent.press(screen.getByTestId('dp-open'));

beforeEach(() => jest.clearAllMocks());

describe('DateTimePickerField', () => {
  it('shows a dash when nothing is picked', () => {
    mount();
    expect(screen.getByText('—')).toBeOnTheScreen();
  });

  it('shows a picked date in the admin date format', () => {
    mount({ value: new Date(2030, 0, 9, 8, 30) });
    expect(screen.getByText('date:2030-1-9')).toBeOnTheScreen();
  });

  it('shows date and time when the field asks for a time too', () => {
    mount({ value: new Date(2030, 0, 9, 8, 30), withTime: true });
    expect(screen.getByText('datetime:8:30')).toBeOnTheScreen();
  });

  it('shows the hint under the label', () => {
    mount({ hint: 'At most 30 days ahead' });
    expect(screen.getByText('At most 30 days ahead')).toBeOnTheScreen();
  });

  it('keeps the calendar closed until the field is pressed, then hands it the value and limits', () => {
    const value = new Date(2030, 0, 9);
    const minDateTime = new Date(2030, 0, 1);
    mount({ value, minDateTime, withTime: true });
    expect(mockSheet).not.toHaveBeenCalled();
    open();
    expect(mockSheet.mock.calls[0][0]).toMatchObject({
      initial: value,
      minDateTime,
      showTime: true,
    });
  });

  it('has no earliest moment unless it is given one, and no time by default', () => {
    mount();
    open();
    expect(mockSheet.mock.calls[0][0]).toMatchObject({
      initial: null,
      minDateTime: null,
      showTime: false,
    });
  });

  it('answers a picked date as a local midnight when no time is asked for, and closes', async () => {
    const onChange = mount();
    open();
    await act(async () => {
      fireEvent.press(screen.getByTestId('calendar-done'));
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toEqual(new Date(2031, 1, 5, 0, 0, 0, 0));
    await waitFor(() => expect(screen.queryByTestId('calendar-done')).toBeNull());
  });

  it('answers the picked moment untouched when a time is asked for', async () => {
    const onChange = mount({ withTime: true });
    open();
    await act(async () => {
      fireEvent.press(screen.getByTestId('calendar-done'));
    });
    expect(onChange.mock.calls[0][0]).toEqual(new Date(2031, 1, 5, 17, 45));
  });

  it('answers nothing when the sheet is dismissed', async () => {
    const onChange = mount();
    open();
    await act(async () => {
      fireEvent.press(screen.getAllByLabelText('mweb.common.close')[0] as never);
    });
    expect(onChange).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByTestId('calendar-done')).toBeNull());
  });

  it('does not open while disabled', async () => {
    mount({ disabled: true });
    await userEvent.setup().press(screen.getByTestId('dp-open'));
    expect(mockSheet).not.toHaveBeenCalled();
  });
});
