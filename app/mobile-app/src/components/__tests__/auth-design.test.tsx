import { fireEvent, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { Text } from 'tamagui';

import { AuthAvatarsStrip } from '@/components/AuthAvatarsStrip';
import { AuthBackground } from '@/components/AuthBackground';
import { AuthCard } from '@/components/AuthCard';
import { AuthDivider } from '@/components/AuthDivider';
import { AuthLogo } from '@/components/AuthLogo';
import { AuthScaffold } from '@/components/AuthScaffold';
import { LegalLinks } from '@/components/LegalLinks';
import { useBranding } from '@/hooks/useBranding';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useBranding');
const mockedUseBranding = jest.mocked(useBranding);

let mockScheme: 'light' | 'dark' = 'light';
jest.mock('@/stores/theme.store', () => ({
  useThemeStore: (selector: (s: { scheme: 'light' | 'dark' }) => unknown) =>
    selector({ scheme: mockScheme }),
}));

const brandingResult = (overrides: Record<string, unknown>) =>
  ({
    data: { branding: { app_name: 'Duncit', logo_url: '', primary_color: '#ff5757' } },
    isLoading: false,
    ...overrides,
  }) as never;

beforeEach(() => {
  jest.clearAllMocks();
  mockScheme = 'light';
  mockedUseBranding.mockReturnValue(brandingResult({}));
});

describe('AuthBackground', () => {
  it('renders children in light and dark schemes', () => {
    renderWithProviders(
      <AuthBackground>
        <Text testID="bg-child">hi</Text>
      </AuthBackground>,
    );
    expect(screen.getByTestId('bg-child')).toBeTruthy();
    mockScheme = 'dark';
    renderWithProviders(
      <AuthBackground>
        <Text testID="bg-child-dark">hi</Text>
      </AuthBackground>,
    );
    expect(screen.getByTestId('bg-child-dark')).toBeTruthy();
  });
});

describe('AuthCard', () => {
  it('renders children for the dark scheme', () => {
    mockScheme = 'dark';
    renderWithProviders(
      <AuthCard testID="card">
        <Text testID="card-child">x</Text>
      </AuthCard>,
    );
    expect(screen.getByTestId('card')).toBeTruthy();
    expect(screen.getByTestId('card-child')).toBeTruthy();
  });
});

describe('AuthDivider', () => {
  it('renders the default and a custom label', () => {
    const { rerender } = renderWithProviders(<AuthDivider />);
    expect(screen.getByText('OR')).toBeTruthy();
    rerender(<AuthDivider label="OR EMAIL" />);
    expect(screen.getByText('OR EMAIL')).toBeTruthy();
  });
});

describe('AuthAvatarsStrip', () => {
  it('renders the caption and avatars', () => {
    renderWithProviders(<AuthAvatarsStrip caption="New pods waiting" />);
    expect(screen.getByText('New pods waiting')).toBeTruthy();
    expect(screen.getByTestId('auth-avatars-strip')).toBeTruthy();
  });
});

describe('LegalLinks', () => {
  it('renders with the default prefix', () => {
    renderWithProviders(<LegalLinks />);
    expect(screen.getByTestId('legal-terms')).toBeTruthy();
  });

  it('opens the terms and privacy URLs', () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
    renderWithProviders(<LegalLinks prefix="By signing in," />);
    fireEvent.press(screen.getByTestId('legal-terms'));
    fireEvent.press(screen.getByTestId('legal-privacy'));
    expect(open).toHaveBeenCalledTimes(2);
    expect(open.mock.calls[0]?.[0]).toMatch(/terms/);
    expect(open.mock.calls[1]?.[0]).toMatch(/privacy/);
    open.mockRestore();
  });
});

describe('AuthLogo', () => {
  it('shows a spinner while branding loads', () => {
    mockedUseBranding.mockReturnValue(brandingResult({ data: undefined, isLoading: true }));
    renderWithProviders(<AuthLogo />);
    expect(screen.getByTestId('auth-logo-loading')).toBeTruthy();
  });

  it('renders a remote raster logo as an image and follows its aspect ratio on load', () => {
    mockedUseBranding.mockReturnValue(
      brandingResult({
        data: { branding: { app_name: 'Duncit', logo_url: 'https://cdn.duncit.com/logo.png' } },
      }),
    );
    renderWithProviders(<AuthLogo size={40} />);
    const img = screen.getByTestId('auth-logo-image');
    expect(img).toBeTruthy();
    // Defaults to a square box (no gap) before the natural size is known.
    expect(img.props.style).toMatchObject({ height: 40, width: 40 });
    // After load, width tracks the intrinsic aspect ratio (clamped to 4×).
    fireEvent(img, 'load', { nativeEvent: { source: { width: 200, height: 100 } } });
    expect(screen.getByTestId('auth-logo-image').props.style).toMatchObject({
      height: 40,
      width: 80,
    });
    // Very wide marks are clamped to 4× the height.
    fireEvent(img, 'load', { nativeEvent: { source: { width: 1000, height: 100 } } });
    expect(screen.getByTestId('auth-logo-image').props.style).toMatchObject({
      height: 40,
      width: 160,
    });
    // A load event without usable dimensions keeps the last known aspect.
    fireEvent(img, 'load', { nativeEvent: { source: { width: 0, height: 0 } } });
    expect(screen.getByTestId('auth-logo-image').props.style).toMatchObject({
      height: 40,
      width: 160,
    });
  });

  it('prefers the mobile-specific logo over the global one', () => {
    mockedUseBranding.mockReturnValue(
      brandingResult({
        data: {
          branding: {
            app_name: 'Duncit',
            logo_url: 'https://cdn.duncit.com/global.png',
            mobile_logo_url: 'https://cdn.duncit.com/mobile.png',
          },
        },
      }),
    );
    renderWithProviders(<AuthLogo />);
    expect(screen.getByTestId('auth-logo-image').props.source).toMatchObject({
      uri: 'https://cdn.duncit.com/mobile.png',
    });
  });

  it('falls back to the app-name monogram for an SVG/empty logo', () => {
    mockedUseBranding.mockReturnValue(
      brandingResult({ data: { branding: { app_name: 'Duncit', logo_url: '/duncit-logo.svg' } } }),
    );
    renderWithProviders(<AuthLogo />);
    expect(screen.getByTestId('auth-logo-mark')).toBeTruthy();
    expect(screen.getByText('D')).toBeTruthy();
  });

  it('renders a D monogram even when branding has no app name', () => {
    mockedUseBranding.mockReturnValue(
      brandingResult({ data: { branding: { app_name: '', logo_url: '' } } }),
    );
    renderWithProviders(<AuthLogo />);
    expect(screen.getByTestId('auth-logo-mark')).toBeTruthy();
  });
});

describe('AuthScaffold', () => {
  it('renders the heading, accent word, subtitle, logo and children', () => {
    renderWithProviders(
      <AuthScaffold
        title="Welcome"
        accentWord="back."
        subtitle="Pick up where you left off"
        testID="scaffold"
      >
        <Text testID="scaffold-child">form</Text>
      </AuthScaffold>,
    );
    expect(screen.getByTestId('scaffold')).toBeTruthy();
    expect(screen.getByText('back.')).toBeTruthy();
    expect(screen.getByText('Pick up where you left off')).toBeTruthy();
    expect(screen.getByTestId('auth-logo-mark')).toBeTruthy();
    expect(screen.getByTestId('scaffold-child')).toBeTruthy();
  });
});
