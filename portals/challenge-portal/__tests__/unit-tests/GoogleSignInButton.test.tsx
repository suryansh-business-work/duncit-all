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
    expect(screen.queryByTestId('glogin')).not.toBeInTheDocument();
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
    expect(glogin.props.text).toBe('continue_with');
    expect(typeof glogin.props.width).toBe('number');
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

  it('shows a loading overlay and recomputes width on resize', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'real-client-id');
    const { container } = renderWithProviders(<GoogleSignInButton onCredential={vi.fn()} loading />);
    expect(container.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
    fireEvent(window, new Event('resize'));
    expect(screen.getByTestId('glogin')).toBeInTheDocument();
  });

  it('removes the resize listener on unmount', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'real-client-id');
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderWithProviders(<GoogleSignInButton onCredential={vi.fn()} />);
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    removeSpy.mockRestore();
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
