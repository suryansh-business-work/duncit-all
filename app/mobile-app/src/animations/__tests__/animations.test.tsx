import { fireEvent, screen } from '@testing-library/react-native';
import { Text } from 'tamagui';

import { PressScale, pressedOpacityStyle } from '@/animations/PressScale';
import { Reveal } from '@/animations/Reveal';
import { renderWithProviders } from '@/utils/test-utils';

describe('Reveal', () => {
  it('renders children inside the animated entry view', () => {
    renderWithProviders(
      <Reveal testID="reveal-plain">
        <Text>revealed</Text>
      </Reveal>,
    );
    expect(screen.getByTestId('reveal-plain')).toBeOnTheScreen();
    expect(screen.getByText('revealed')).toBeOnTheScreen();
  });

  it('supports the staggered card variant (index + scale)', () => {
    renderWithProviders(
      <Reveal testID="reveal-card" index={3} scale>
        <Text>card</Text>
      </Reveal>,
    );
    expect(screen.getByTestId('reveal-card')).toBeOnTheScreen();
    expect(screen.getByText('card')).toBeOnTheScreen();
  });
});

describe('PressScale', () => {
  it('fires onPress and dims to 0.85 only while pressed', () => {
    const onPress = jest.fn();
    renderWithProviders(
      <PressScale testID="press-scale" accessibilityLabel="Do it" onPress={onPress}>
        <Text>tap</Text>
      </PressScale>,
    );
    fireEvent.press(screen.getByTestId('press-scale'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('dims to 0.85 only while pressed', () => {
    expect(pressedOpacityStyle(undefined, true)).toEqual([undefined, { opacity: 0.85 }]);
    expect(pressedOpacityStyle(undefined, false)).toEqual([undefined, { opacity: 1 }]);
  });

  it('ignores presses when disabled', () => {
    const onPress = jest.fn();
    renderWithProviders(
      <PressScale testID="press-disabled" disabled onPress={onPress}>
        <Text>no</Text>
      </PressScale>,
    );
    fireEvent.press(screen.getByTestId('press-disabled'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('renders without an onPress handler', () => {
    renderWithProviders(
      <PressScale testID="press-bare">
        <Text>bare</Text>
      </PressScale>,
    );
    const target = screen.getByTestId('press-bare');
    fireEvent(target, 'pressIn');
    fireEvent(target, 'pressOut');
    expect(target).toBeOnTheScreen();
  });
});
