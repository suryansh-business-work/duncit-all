import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { gql } from '@apollo/client';
import { describe, expect, it } from 'vitest';
import AuthLogo from '../AuthLogo';
import { FALLBACK_ICONS } from '../../fallback-icons';

const AUTH_BRANDING = gql`
  query AuthBranding {
    branding {
      app_name
      logo_url
      mweb_logo_url
      primary_color
    }
  }
`;

const brandingMock = (over: Record<string, string | null>) => ({
  request: { query: AUTH_BRANDING },
  result: {
    data: {
      branding: {
        app_name: 'Duncit',
        logo_url: null,
        mweb_logo_url: null,
        primary_color: '#000',
        ...over,
      },
    },
  },
});

const renderLogo = (over: Record<string, string | null>) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[brandingMock(over)]}>
      <AuthLogo tagline="Welcome back" />
    </MockedProvider>,
  );

describe('AuthLogo', () => {
  it('prefers the mWeb logo, then the global one', async () => {
    renderLogo({ logo_url: 'https://cdn.test/global.png', mweb_logo_url: 'https://cdn.test/mweb.png' });
    expect(await screen.findByRole('img')).toHaveAttribute('src', 'https://cdn.test/mweb.png');
  });

  it('renders the BUNDLED logo when the admin has configured none', async () => {
    renderLogo({});
    // Not the app name — an unconfigured logo must still render a logo.
    expect(await screen.findByRole('img')).toHaveAttribute('src', FALLBACK_ICONS.logo);
  });

  it('swaps to the bundled logo when the server image fails to load', async () => {
    renderLogo({ logo_url: 'https://cdn.test/deleted.png' });
    const img = await screen.findByRole('img');
    expect(img).toHaveAttribute('src', 'https://cdn.test/deleted.png');

    // A deleted or unreachable URL fires onError rather than arriving empty.
    fireEvent.error(img);
    expect(await screen.findByRole('img')).toHaveAttribute('src', FALLBACK_ICONS.logo);
  });
});

describe('AuthLogo — square tile (the auth screens)', () => {
  const renderSquare = (over: Record<string, string | null>) =>
    render(
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[brandingMock(over)]}>
        <AuthLogo size={48} square />
      </MockedProvider>,
    );

  it('holds a square placeholder of the tile’s size while the branding loads', () => {
    renderSquare({});
    const skeleton = screen.getByTestId('auth-logo-skeleton');
    expect(skeleton).toHaveStyle({ width: '48px', height: '48px' });
  });

  it('contains the logo in the tile, whatever the art’s shape', async () => {
    renderSquare({ mweb_logo_url: 'https://cdn.test/wordmark.png' });
    const tile = await screen.findByTestId('auth-logo-tile');
    const img = screen.getByRole('img', { name: 'Duncit' });
    expect(tile).toContainElement(img);
    expect(img).toHaveAttribute('src', 'https://cdn.test/wordmark.png');
  });

  it('keeps the bundled fallback inside the tile when the server image fails', async () => {
    renderSquare({ logo_url: 'https://cdn.test/deleted.png' });
    fireEvent.error(await screen.findByRole('img'));
    expect(await screen.findByRole('img')).toHaveAttribute('src', FALLBACK_ICONS.logo);
    expect(screen.getByTestId('auth-logo-tile')).toContainElement(screen.getByRole('img'));
  });

  it('draws no tile by default — the wide logo keeps its own shape', async () => {
    renderLogo({ mweb_logo_url: 'https://cdn.test/mweb.png' });
    await screen.findByRole('img');
    expect(screen.queryByTestId('auth-logo-tile')).not.toBeInTheDocument();
  });
});
