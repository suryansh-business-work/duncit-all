import { act, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { Text } from 'tamagui';

import { KeyboardScreen } from '@/components/KeyboardScreen';
import { SplashOverlay } from '@/components/SplashOverlay';
import { useBranding } from '@/hooks/useBranding';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useBranding');
const mockedUseBranding = jest.mocked(useBranding);

const brandingWith = (overrides: Record<string, unknown>) =>
  ({
    data: {
      branding: {
        app_name: 'Duncit',
        logo_url: '',
        mobile_splash_url: '',
        mobile_splash_type: 'IMAGE',
        ...overrides,
      },
    },
    isLoading: false,
  }) as never;

beforeEach(() => {
  mockedUseBranding.mockReturnValue(brandingWith({}));
});

describe('KeyboardScreen', () => {
  it('renders children inside the avoiding view (padding on both platforms)', () => {
    renderWithProviders(
      <KeyboardScreen>
        <Text>inside</Text>
      </KeyboardScreen>,
    );
    expect(screen.getByText('inside')).toBeOnTheScreen();
  });

  it('applies the padding behaviour on Android too (edge-to-edge ignores resize)', () => {
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

  it('shows the brand splash (logo fallback) then fades out and calls onDone', () => {
    const onDone = jest.fn();
    renderWithProviders(<SplashOverlay onDone={onDone} />);
    expect(screen.getByTestId('splash-overlay')).toBeOnTheScreen();
    expect(screen.getByTestId('auth-logo-mark')).toBeOnTheScreen();

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

  it('shows the logo splash before branding has loaded', () => {
    mockedUseBranding.mockReturnValue({ data: undefined, isLoading: true } as never);
    renderWithProviders(<SplashOverlay />);
    expect(screen.getByTestId('splash-overlay')).toBeOnTheScreen();
    expect(screen.queryByTestId('splash-image')).toBeNull();
  });

  it('treats a splash URL without an explicit type as an image', () => {
    mockedUseBranding.mockReturnValue(
      brandingWith({
        mobile_splash_url: 'https://cdn.duncit.com/splash.jpg',
        mobile_splash_type: undefined,
      }),
    );
    renderWithProviders(<SplashOverlay />);
    expect(screen.getByTestId('splash-image')).toBeOnTheScreen();
  });

  it('renders the admin-configured splash image full-bleed', () => {
    mockedUseBranding.mockReturnValue(
      brandingWith({ mobile_splash_url: 'https://cdn.duncit.com/splash.jpg' }),
    );
    renderWithProviders(<SplashOverlay />);
    expect(screen.getByTestId('splash-image')).toBeOnTheScreen();
    expect(screen.queryByTestId('auth-logo-mark')).toBeNull();
  });

  it('plays the admin-configured splash video for a longer beat', () => {
    mockedUseBranding.mockReturnValue(
      brandingWith({
        mobile_splash_url: 'https://cdn.duncit.com/splash.mp4',
        mobile_splash_type: 'VIDEO',
      }),
    );
    renderWithProviders(<SplashOverlay />);
    expect(screen.getByTestId('splash-video')).toBeOnTheScreen();

    // Still visible after the image window — videos get a 4s beat.
    act(() => {
      jest.advanceTimersByTime(2100);
    });
    expect(screen.getByTestId('splash-overlay')).toBeOnTheScreen();
    act(() => {
      jest.advanceTimersByTime(2400);
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
