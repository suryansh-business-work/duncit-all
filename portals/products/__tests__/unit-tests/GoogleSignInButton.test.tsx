import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import GoogleSignInButton from '../../src/components/GoogleSignInButton';
import { renderWithProviders } from '../testkit';

const glogin = vi.hoisted(() => ({ props: null as unknown as Record<string, any> }));

vi.mock('@react-oauth/google', () => ({
  GoogleLogin: (props: Record<string, any>) => {
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
});

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

  it('renders the Google button and forwards a credential (custom text)', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'real-client-id');
    const onCredential = vi.fn();
    renderWithProviders(<GoogleSignInButton onCredential={onCredential} text="continue_with" />);
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

  it('shows a light-mode loading overlay and recomputes width on resize', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'real-client-id');
    const { container } = renderWithProviders(<GoogleSignInButton onCredential={vi.fn()} loading />);
    expect(container.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
    fireEvent(window, new Event('resize'));
    expect(screen.getByTestId('glogin')).toBeInTheDocument();
  });

  it('measures the host width when the container reports one', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'real-client-id');
    // The effect reads #google-signin-host clientWidth; the setup stub reports
    // 800, clamped to the 400 max — exercising the width-measurement branch.
    renderWithProviders(<GoogleSignInButton onCredential={vi.fn()} />);
    expect(glogin.props.width).toBe(400);
  });

  // Both light and dark are exercised inside one test: v8 branch coverage for
  // the `isDark` ternaries (Google theme + loading-overlay background) is only
  // credited reliably when both outcomes are hit within a single test body.
  it('switches the Google theme and overlay background with the MUI color mode', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'real-client-id');
    const renderMode = (mode: 'light' | 'dark') =>
      render(
        <ThemeProvider theme={createTheme({ palette: { mode } })}>
          <GoogleSignInButton onCredential={vi.fn()} loading />
        </ThemeProvider>,
      );

    const light = renderMode('light');
    expect(glogin.props.theme).toBe('outline');
    expect(light.container.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
    light.unmount();

    const dark = renderMode('dark');
    expect(glogin.props.theme).toBe('filled_black');
    expect(dark.container.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
  });
});
