import { act, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { Text } from 'tamagui';

import { KeyboardScreen } from '@/components/KeyboardScreen';
import { SplashOverlay } from '@/components/SplashOverlay';
import { renderWithProviders } from '@/utils/test-utils';

describe('KeyboardScreen', () => {
  it('renders children inside the avoiding view', () => {
    renderWithProviders(
      <KeyboardScreen>
        <Text>inside</Text>
      </KeyboardScreen>,
    );
    expect(screen.getByText('inside')).toBeOnTheScreen();
  });

  it('uses padding behaviour on iOS and native resize on Android', () => {
    const original = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    renderWithProviders(
      <KeyboardScreen>
        <Text>android</Text>
      </KeyboardScreen>,
    );
    expect(screen.getByText('android')).toBeOnTheScreen();
    Object.defineProperty(Platform, 'OS', { value: original, configurable: true });
  });
});

describe('SplashOverlay', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('shows the brand splash then fades out and calls onDone', () => {
    const onDone = jest.fn();
    renderWithProviders(<SplashOverlay onDone={onDone} />);
    expect(screen.getByTestId('splash-overlay')).toBeOnTheScreen();

    act(() => {
      jest.advanceTimersByTime(1600); // display window
      jest.advanceTimersByTime(400); // fade duration
    });
    expect(screen.queryByTestId('splash-overlay')).toBeNull();
    expect(onDone).toHaveBeenCalled();
  });

  it('works without an onDone callback', () => {
    renderWithProviders(<SplashOverlay />);
    act(() => {
      jest.advanceTimersByTime(2100);
    });
    expect(screen.queryByTestId('splash-overlay')).toBeNull();
  });
});

describe('SupportChatBubble edge branches', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { SupportChatBubble } = require('@/components/support-chat/SupportChatBubble');
  const base = {
    id: 'b1',
    session_id: 's1',
    sender_id: 'a1',
    sender_role: 'AGENT',
    sender_photo: null,
    attachments: [],
    created_at: '',
  };

  it('falls back to "Support" when the agent has no name and hides empty text', () => {
    renderWithProviders(
      <SupportChatBubble
        message={{ ...base, sender_name: '', text: '', attachments: ['https://img/a.jpg'] }}
      />,
    );
    expect(screen.getByText('Support')).toBeOnTheScreen();
    expect(screen.getByTestId('support-msg-b1')).toBeOnTheScreen();
  });

  it('renders my own (USER) bubble without the sender label', () => {
    renderWithProviders(
      <SupportChatBubble
        message={{ ...base, sender_role: 'USER', sender_name: 'Me', text: 'hi' }}
      />,
    );
    expect(screen.getByText('hi')).toBeOnTheScreen();
    expect(screen.queryByText('Me')).toBeNull();
  });
});
