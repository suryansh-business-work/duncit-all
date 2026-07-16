import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import GoogleSignInButton from '../../src/components/GoogleSignInButton';
import { appConfig } from '../../src/config/app-config';
import { renderWithProviders } from './testkit';

const glogin = vi.hoisted(() => ({ props: null as any }));

vi.mock('@react-oauth/google', () => ({
  GoogleLogin: (props: any) => {
    glogin.props = props;
    return (
      <button data-testid="glogin" onClick={() => props.onSuccess({ credential: 'id-token' })}>
        Google
      </button>
    );
  },
}));

afterEach(() => {
  vi.unstubAllEnvs();
  localStorage.clear();
});

// The shared theme provider defaults to dark mode; this key forces light so the
// button's light-theme branches (Google `outline` theme + light overlay) run.
const COLOR_MODE_KEY = 'duncit_color_mode';

describe('GoogleSignInButton', () => {
  it('renders a configuration warning when no client id is set', () => {
    renderWithProviders(<GoogleSignInButton onCredential={vi.fn()} />);
    expect(screen.getByText(/google sign-in not configured/i)).toBeInTheDocument();
  });

  it('treats the placeholder client id as unconfigured', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'your_client_id_here');
    renderWithProviders(<GoogleSignInButton onCredential={vi.fn()} />);
    expect(screen.getByText(/google sign-in not configured/i)).toBeInTheDocument();
  });

  it('renders the Google button and forwards a credential', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'real-client-id');
    const onCredential = vi.fn();
    renderWithProviders(<GoogleSignInButton onCredential={onCredential} />);
    fireEvent.click(screen.getByTestId('glogin'));
    expect(onCredential).toHaveBeenCalledWith('id-token');
  });

  it('ignores a success response with no credential and a Google error', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'real-client-id');
    const onCredential = vi.fn();
    renderWithProviders(<GoogleSignInButton onCredential={onCredential} />);
    glogin.props.onSuccess({});
    glogin.props.onError();
    expect(onCredential).not.toHaveBeenCalled();
  });

  it('shows a loading overlay in dark mode and recomputes width on resize', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'real-client-id');
    localStorage.setItem(appConfig.colorModeKey, 'dark');
    const { container } = renderWithProviders(<GoogleSignInButton onCredential={vi.fn()} loading />);
    expect(container.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
    // Dark theme selects the filled Google button variant.
    expect(glogin.props.theme).toBe('filled_black');
    fireEvent(window, new Event('resize'));
    expect(screen.getByTestId('glogin')).toBeInTheDocument();
  });

  it('uses the light Google theme and light overlay when color mode is light', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'real-client-id');
    localStorage.setItem(COLOR_MODE_KEY, 'light');
    const { container } = renderWithProviders(<GoogleSignInButton onCredential={vi.fn()} loading />);
    // Light theme selects the outlined Google button variant + light overlay.
    expect(glogin.props.theme).toBe('outline');
    expect(container.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
  });
});
