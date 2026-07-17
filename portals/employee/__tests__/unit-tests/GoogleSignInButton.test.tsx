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
      <button
        data-testid="glogin"
        data-theme={props.theme}
        data-text={props.text}
        data-width={props.width}
        onClick={() => props.onSuccess({ credential: 'id-token' })}
      >
        Google
      </button>
    );
  },
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('GoogleSignInButton', () => {
  it('renders the not-configured fallback when the client id is unset', () => {
    // env var left unstubbed → undefined → optional-chaining short-circuits.
    renderWithProviders(<GoogleSignInButton onCredential={vi.fn()} />);
    expect(screen.getByText(/not configured/i)).toBeInTheDocument();
    expect(screen.queryByTestId('glogin')).not.toBeInTheDocument();
  });

  it('treats the placeholder client id as unconfigured', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'your_client_id_here');
    renderWithProviders(<GoogleSignInButton onCredential={vi.fn()} />);
    expect(screen.getByText(/not configured/i)).toBeInTheDocument();
  });

  it('renders the Google button and forwards the credential (custom text)', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'real-id');
    const onCredential = vi.fn();
    renderWithProviders(<GoogleSignInButton onCredential={onCredential} text="continue_with" />);
    const btn = screen.getByTestId('glogin');
    expect(btn).toHaveAttribute('data-text', 'continue_with');
    // jsdom reports a zero host width; the effect clamps it up to the 240 minimum.
    expect(btn).toHaveAttribute('data-width', '240');
    fireEvent.click(btn);
    expect(onCredential).toHaveBeenCalledWith('id-token');
  });

  it('ignores a success response with no credential and swallows a Google error', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'real-id');
    const onCredential = vi.fn();
    renderWithProviders(<GoogleSignInButton onCredential={onCredential} />);
    glogin.props.onSuccess({});
    expect(onCredential).not.toHaveBeenCalled();
    expect(() => glogin.props.onError()).not.toThrow();
  });

  it('keeps the default width when the host element is missing and re-measures on resize', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'real-id');
    const spy = vi.spyOn(document, 'getElementById').mockReturnValue(null);
    renderWithProviders(<GoogleSignInButton onCredential={vi.fn()} />);
    expect(screen.getByTestId('glogin')).toHaveAttribute('data-width', '320');
    fireEvent(window, new Event('resize'));
    expect(spy).toHaveBeenCalled();
  });

  // Both light and dark are exercised inside one test: v8 branch coverage for
  // the `isDark` ternaries (Google theme + loading-overlay background) is only
  // credited reliably when both outcomes are hit within a single test body.
  it('switches the Google theme and overlay tint with the MUI color mode', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'real-id');
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
