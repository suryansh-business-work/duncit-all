import type { ReactNode } from 'react';
import { Dimensions } from 'react-native';
import { renderHook, screen, within } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text } from 'tamagui';
import { auth } from '@duncit/auth-tokens';

import { AuthScaffold } from '@/components/AuthScaffold';
import { useBranding } from '@/hooks/useBranding';
import { renderWithProviders } from '@/utils/test-utils';

import { AuthHeading } from '../AuthHeading';
import { useAuthFit } from '../useAuthFit';

jest.mock('@/hooks/useBranding');
const mockedUseBranding = jest.mocked(useBranding);

const FIT = auth.fit;
/** The insets renderWithProviders gives every screen (47 status bar, 34 home bar). */
const INSETS = { top: 47, left: 0, right: 0, bottom: 34 };

const withHero = (image: string) =>
  mockedUseBranding.mockReturnValue({
    data: {
      branding: {
        app_name: 'Duncit',
        logo_url: '',
        login_background_image_enabled: image !== '',
        login_background_image_url: image,
        login_background_video_enabled: false,
        login_background_video_url: '',
      },
    },
    isLoading: false,
  } as never);

const dimensions = jest.spyOn(Dimensions, 'get');
const setWindowHeight = (height: number) =>
  dimensions.mockReturnValue({ width: 390, height, scale: 2, fontScale: 1 });

function renderScaffold(subtitle?: string) {
  return renderWithProviders(
    <AuthScaffold testID="scaffold" title="Welcome" accentWord="back!" subtitle={subtitle}>
      <Text testID="scaffold-child">form</Text>
    </AuthScaffold>,
  );
}

function fitAt(height: number) {
  setWindowHeight(height);
  const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 390, height }, insets: INSETS }}
    >
      {children}
    </SafeAreaProvider>
  );
  return renderHook(() => useAuthFit(), { wrapper }).result.current;
}

beforeEach(() => {
  jest.clearAllMocks();
  setWindowHeight(844);
  withHero('');
});

afterAll(() => {
  dimensions.mockRestore();
});

describe('AuthScaffold', () => {
  it('lays the heading, content and mode switch out on the flat ground without a hero', () => {
    renderScaffold('You have been signed out everywhere');

    expect(screen.getByTestId('scaffold')).toBeOnTheScreen();
    expect(screen.queryByTestId('auth-hero')).toBeNull();
    const heading = screen.getByTestId('auth-heading');
    expect(within(heading).getByTestId('auth-logo-tile')).toBeOnTheScreen();
    expect(within(heading).getByText('back!')).toBeOnTheScreen();
    expect(within(heading).getByTestId('auth-heading-subtitle')).toHaveTextContent(
      'You have been signed out everywhere',
    );
    expect(screen.getByTestId('scaffold-child')).toBeOnTheScreen();
    expect(screen.getByTestId('auth-mode-toggle')).toBeOnTheScreen();
  });

  it('puts the heading on the hero and keeps the content on the ground below it', () => {
    withHero('https://cdn/login.jpg');
    renderScaffold();

    const hero = screen.getByTestId('auth-hero');
    expect(within(hero).getByTestId('auth-backdrop-image')).toBeOnTheScreen();
    expect(within(hero).getByTestId('auth-heading')).toBeOnTheScreen();
    expect(within(hero).queryByTestId('scaffold-child')).toBeNull();
    expect(within(hero).queryByTestId('auth-mode-toggle')).toBeNull();
    expect(screen.getByTestId('scaffold-child')).toBeOnTheScreen();
  });
});

describe('AuthHeading', () => {
  it('leaves the subtitle out when there is none', () => {
    renderWithProviders(<AuthHeading title="Welcome" />);
    expect(screen.getByRole('heading')).toHaveTextContent('Welcome');
    expect(screen.queryByTestId('auth-heading-subtitle')).toBeNull();
  });

  it('draws the headline at full size on a tall window', () => {
    setWindowHeight(1200);
    renderWithProviders(<AuthHeading title="Welcome" accentWord="back!" />);
    expect(screen.getByRole('heading')).toHaveStyle({ fontSize: FIT.titleSize });
  });

  it('shrinks the headline on a short window, never under its floor', () => {
    setWindowHeight(480);
    renderWithProviders(<AuthHeading title="Welcome" accentWord="back!" />);
    expect(screen.getByRole('heading')).toHaveStyle({ fontSize: FIT.titleMinSize });
  });
});

describe('useAuthFit', () => {
  it('keeps the design size when the safe window holds the whole design', () => {
    const fit = fitAt(FIT.designHeight + INSETS.top + INSETS.bottom + 100);
    expect(fit.scale).toBe(FIT.maxScale);
    expect(fit.size(FIT.gap)).toBe(FIT.gap);
  });

  it('shrinks only the flexible part on a mid-height phone', () => {
    const height = 844;
    const fit = fitAt(height);
    const expected =
      (height - INSETS.top - INSETS.bottom - FIT.fixedHeight) /
      (FIT.designHeight - FIT.fixedHeight);
    expect(fit.scale).toBeCloseTo(expected, 5);
    expect(fit.scale).toBeLessThan(FIT.maxScale);
    expect(fit.size(FIT.gap)).toBe(Math.round(FIT.gap * expected));
  });

  it('stops at the minimum scale and honours a size floor on a very short window', () => {
    const fit = fitAt(480);
    expect(fit.scale).toBe(FIT.minScale);
    expect(fit.size(FIT.gap)).toBe(Math.round(FIT.gap * FIT.minScale));
    expect(fit.size(FIT.titleSize, FIT.titleMinSize)).toBe(FIT.titleMinSize);
  });
});
