import { AccessibilityInfo, Platform } from 'react-native';
import { act, fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/utils/test-utils';
import { OccasionGreeting } from '../OccasionGreeting';

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const originalOS = Platform.OS;
const onPlatform = (os: typeof Platform.OS) =>
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
const announce = jest
  .spyOn(AccessibilityInfo, 'announceForAccessibility')
  .mockImplementation(() => undefined);

beforeEach(() => {
  jest.useFakeTimers();
  announce.mockClear();
  onPlatform('ios');
});

afterEach(() => {
  jest.useRealTimers();
  onPlatform(originalOS);
});

describe('OccasionGreeting', () => {
  it('shows the look’s line under the header and tells a VoiceOver user', () => {
    renderWithProviders(
      <OccasionGreeting
        lookKey="christmas"
        text="  Merry Christmas from Duncit!  "
        reduceMotion={false}
      />,
    );
    expect(screen.getByText('Merry Christmas from Duncit!')).toBeOnTheScreen();
    expect(announce).toHaveBeenCalledWith('Merry Christmas from Duncit!');
    expect(screen.getByRole('button', { name: 'ui.occasion.dismiss' })).toBeOnTheScreen();
  });

  it('greets once a launch: the same look does not greet again', () => {
    renderWithProviders(
      <OccasionGreeting lookKey="diwali" text="Happy Diwali!" reduceMotion={false} />,
    );
    expect(screen.getByTestId('occasion-greeting')).toBeOnTheScreen();
    screen.unmount();

    renderWithProviders(
      <OccasionGreeting lookKey="diwali" text="Happy Diwali!" reduceMotion={false} />,
    );
    expect(screen.queryByTestId('occasion-greeting')).toBeNull();
  });

  it('goes by itself after a few seconds', () => {
    renderWithProviders(<OccasionGreeting lookKey="holi" text="Happy Holi!" reduceMotion />);
    act(() => jest.advanceTimersByTime(5900));
    expect(screen.getByTestId('occasion-greeting')).toBeOnTheScreen();
    act(() => jest.advanceTimersByTime(200));
    expect(screen.queryByTestId('occasion-greeting')).toBeNull();
  });

  it('goes straight away with its close button', () => {
    renderWithProviders(
      <OccasionGreeting lookKey="eid" text="Eid Mubarak!" reduceMotion={false} />,
    );
    fireEvent.press(screen.getByTestId('occasion-greeting-close'));
    expect(screen.queryByTestId('occasion-greeting')).toBeNull();
  });

  it('shows nothing for a look with no greeting', () => {
    renderWithProviders(
      <OccasionGreeting lookKey="republic-day" text="   " reduceMotion={false} />,
    );
    expect(screen.queryByTestId('occasion-greeting')).toBeNull();
    expect(announce).not.toHaveBeenCalled();
  });

  it('leaves the announcing to the live region on Android', () => {
    onPlatform('android');
    renderWithProviders(
      <OccasionGreeting lookKey="onam" text="Happy Onam!" reduceMotion={false} />,
    );
    expect(screen.getByText('Happy Onam!')).toBeOnTheScreen();
    expect(announce).not.toHaveBeenCalled();
  });
});
