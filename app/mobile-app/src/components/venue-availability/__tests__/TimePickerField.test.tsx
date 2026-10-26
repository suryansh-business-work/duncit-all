import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { renderWithProviders } from '@/utils/test-utils';
import { TimePickerField } from '../TimePickerField';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});
jest.mock('@/hooks/useDateFormat', () => ({
  useDateFormat: () => ({ timeFormat: 'HH:mm', formatClock: (value: string) => `clock:${value}` }),
}));

const mount = (value: string) => {
  const onChange = jest.fn();
  renderWithProviders(
    <TimePickerField label="Start" value={value} onChange={onChange} testID="tp" />,
  );
  return onChange;
};

const open = () => fireEvent.press(screen.getByTestId('tp-open'));
const checked = (testID: string) => screen.getByTestId(testID).props['aria-checked'];

describe('TimePickerField', () => {
  it('shows the time in the admin clock format', () => {
    mount('18:30');
    expect(screen.getByText('clock:18:30')).toBeOnTheScreen();
  });

  it('shows a dash when no time is set', () => {
    mount('');
    expect(screen.getByText('—')).toBeOnTheScreen();
  });

  it('keeps the sheet closed until the field is pressed', () => {
    mount('18:30');
    expect(screen.queryByTestId('tp-hour-18')).toBeNull();
    open();
    expect(screen.getByTestId('tp-hour-18')).toBeOnTheScreen();
  });

  it('opens on the current time', () => {
    mount('18:30');
    open();
    expect(checked('tp-hour-18')).toBe(true);
    expect(checked('tp-hour-9')).toBe(false);
    expect(checked('tp-minute-30')).toBe(true);
    expect(checked('tp-minute-0')).toBe(false);
  });

  it('opens on midnight when no time is set', () => {
    mount('');
    open();
    expect(checked('tp-hour-0')).toBe(true);
    expect(checked('tp-minute-0')).toBe(true);
  });

  it('rounds a minute the chips do not offer down to the hour', () => {
    mount('18:07');
    open();
    expect(checked('tp-minute-0')).toBe(true);
  });

  it('answers the picked hour and quarter-hour, zero padded, and closes', async () => {
    const onChange = mount('18:30');
    open();
    fireEvent.press(screen.getByTestId('tp-hour-7'));
    fireEvent.press(screen.getByTestId('tp-minute-45'));
    await act(async () => {
      fireEvent.press(screen.getByLabelText('mweb.createPod.done'));
    });
    expect(onChange).toHaveBeenCalledWith('07:45');
    await waitFor(() => expect(screen.queryByTestId('tp-hour-7')).toBeNull());
  });

  it('answers the unchanged time when done is pressed straight away', async () => {
    const onChange = mount('06:15');
    open();
    await act(async () => {
      fireEvent.press(screen.getByLabelText('mweb.createPod.done'));
    });
    expect(onChange).toHaveBeenCalledWith('06:15');
  });

  it('answers nothing when the sheet is dismissed', async () => {
    const onChange = mount('18:30');
    open();
    await act(async () => {
      fireEvent.press(screen.getAllByLabelText('mweb.common.close')[0] as never);
    });
    expect(onChange).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByTestId('tp-hour-18')).toBeNull());
  });
});
