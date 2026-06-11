import { fireEvent, screen } from '@testing-library/react-native';
import { Text } from 'tamagui';

import { PressScale } from '@/animations/PressScale';
import { Reveal } from '@/animations/Reveal';
import { MAX_STAGGER_STEPS, STAGGER_MS, staggerDelay } from '@/animations/motion';
import { renderWithProviders } from '@/utils/test-utils';

describe('staggerDelay', () => {
  it('adds one step per index and caps long groups', () => {
    expect(staggerDelay(0)).toBe(0);
    expect(staggerDelay(-2)).toBe(0);
    expect(staggerDelay(1)).toBe(STAGGER_MS);
    expect(staggerDelay(3)).toBe(3 * STAGGER_MS);
    expect(staggerDelay(50)).toBe(MAX_STAGGER_STEPS * STAGGER_MS);
  });
});

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
  it('fires onPress and animates the press in/out cycle', () => {
    const onPress = jest.fn();
    renderWithProviders(
      <PressScale testID="press-scale" accessibilityLabel="Do it" onPress={onPress}>
        <Text>tap</Text>
      </PressScale>,
    );
    const target = screen.getByTestId('press-scale');
    fireEvent(target, 'pressIn');
    fireEvent(target, 'pressOut');
    fireEvent.press(target);
    expect(onPress).toHaveBeenCalledTimes(1);
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
