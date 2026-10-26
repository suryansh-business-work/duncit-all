import { screen, userEvent } from '@testing-library/react-native';

import { renderWithProviders } from '@/utils/test-utils';
import { PickerTrigger } from '../PickerTrigger';

const mount = (props: Partial<React.ComponentProps<typeof PickerTrigger>> = {}) => {
  const onPress = jest.fn();
  renderWithProviders(
    <PickerTrigger
      testID="pick"
      label="Start date"
      shown="09 Jan 2030"
      hasValue
      icon="event"
      onPress={onPress}
      {...props}
    />,
  );
  return onPress;
};

describe('PickerTrigger', () => {
  it('shows what is picked and is named by its label', () => {
    mount();
    expect(screen.getByText('09 Jan 2030')).toBeOnTheScreen();
    expect(screen.getByTestId('pick-open').props['aria-label']).toBe('Start date');
  });

  it('opens the picker when pressed', async () => {
    const onPress = mount();
    await userEvent.setup().press(screen.getByTestId('pick-open'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows the placeholder dash in a muted tone when nothing is picked', () => {
    mount({ shown: '—', hasValue: false });
    expect(screen.UNSAFE_getByProps({ children: '—' }).props.color).toBe('$muted');
  });

  it('shows a picked value in the normal text colour', () => {
    mount();
    expect(screen.UNSAFE_getByProps({ children: '09 Jan 2030' }).props.color).toBe('$color');
  });

  it('is inert while disabled', async () => {
    const onPress = mount({ disabled: true });
    expect(screen.getByTestId('pick-open').props['aria-disabled']).toBe(true);
    await userEvent.setup().press(screen.getByTestId('pick-open'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('is enabled by default', () => {
    mount();
    expect(screen.getByTestId('pick-open').props['aria-disabled']).toBe(false);
  });
});
