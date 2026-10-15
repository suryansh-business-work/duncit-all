import { fireEvent, screen, within } from '@testing-library/react-native';

import { AuthLogo } from '@/components/AuthLogo';
import { useBranding } from '@/hooks/useBranding';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useBranding');
const mockedUseBranding = jest.mocked(useBranding);

const withLogo = (logoUrl: string) =>
  mockedUseBranding.mockReturnValue({
    data: { branding: { app_name: 'Duncit', logo_url: logoUrl } },
    isLoading: false,
  } as never);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('AuthLogo — square tile (auth screens)', () => {
  it('holds a wide wordmark inside a size × size tile instead of widening', () => {
    withLogo('https://cdn.duncit.com/wordmark.png');
    renderWithProviders(<AuthLogo size={56} square />);

    const tile = screen.getByTestId('auth-logo-tile');
    const image = within(tile).getByTestId('auth-logo-image');
    expect(image.props.style).toMatchObject({ height: 56, width: 56 });

    // A 4:1 wordmark would be 224 wide unboxed; the tile keeps it square.
    fireEvent(image, 'load', { source: { width: 400, height: 100 } });
    expect(screen.getByTestId('auth-logo-image').props.style).toMatchObject({
      height: 56,
      width: 56,
    });
  });

  it('boxes the bundled logo the same way when there is no raster logo', () => {
    withLogo('');
    renderWithProviders(<AuthLogo size={48} square />);

    const tile = screen.getByTestId('auth-logo-tile');
    expect(within(tile).getByTestId('auth-logo-fallback').props.style).toMatchObject({
      height: 48,
      width: 48,
    });
  });

  it('draws no tile for the default (non-square) logo', () => {
    withLogo('https://cdn.duncit.com/wordmark.png');
    renderWithProviders(<AuthLogo size={40} />);

    expect(screen.queryByTestId('auth-logo-tile')).toBeNull();
    fireEvent(screen.getByTestId('auth-logo-image'), 'load', {
      source: { width: 400, height: 100 },
    });
    expect(screen.getByTestId('auth-logo-image').props.style).toMatchObject({
      height: 40,
      width: 160,
    });
  });
});
