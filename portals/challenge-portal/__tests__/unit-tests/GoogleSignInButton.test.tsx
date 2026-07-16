import { describe, expect, it, vi, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const googleProps = vi.hoisted(() => ({ current: null as Record<string, any> | null }));

vi.mock('@react-oauth/google', () => ({
  GoogleLogin: (props: Record<string, any>) => {
    googleProps.current = props;
    return (
      <div data-testid="google-login">
        <button type="button" onClick={() => props.onSuccess({ credential: 'tok-123' })}>
          succeed
        </button>
        <button type="button" onClick={() => props.onSuccess({})}>
          succeed-empty
        </button>
        <button type="button" onClick={() => props.onError()}>
          err
        </button>
      </div>
    );
  },
}));

import GoogleSignInButton from '../../src/components/GoogleSignInButton';

const withTheme = (mode: 'light' | 'dark', ui: React.ReactElement) =>
  render(<ThemeProvider theme={createTheme({ palette: { mode } })}>{ui}</ThemeProvider>);

describe('GoogleSignInButton', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('renders the not-configured fallback when the client id is missing', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '');
    withTheme('light', <GoogleSignInButton onCredential={vi.fn()} />);
    expect(screen.getByText(/Google sign-in not configured/)).toBeInTheDocument();
    expect(screen.queryByTestId('google-login')).not.toBeInTheDocument();
  });

  it('renders the fallback for the placeholder client id', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'your_client_id_here');
    withTheme('light', <GoogleSignInButton onCredential={vi.fn()} />);
    expect(screen.getByText(/Google sign-in not configured/)).toBeInTheDocument();
  });

  it('fires onCredential only when Google returns a credential', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'real-client-id');
    const onCredential = vi.fn();
    withTheme('light', <GoogleSignInButton onCredential={onCredential} text="continue_with" />);

    expect(googleProps.current?.theme).toBe('outline');
    expect(googleProps.current?.text).toBe('continue_with');
    expect(typeof googleProps.current?.width).toBe('number');

    fireEvent.click(screen.getByText('succeed'));
    expect(onCredential).toHaveBeenCalledWith('tok-123');

    onCredential.mockClear();
    fireEvent.click(screen.getByText('succeed-empty'));
    expect(onCredential).not.toHaveBeenCalled();

    // onError is a no-op — must not throw.
    fireEvent.click(screen.getByText('err'));
  });

  it('uses the dark Google theme in dark mode and shows the loading overlay', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'real-client-id');
    withTheme('dark', <GoogleSignInButton onCredential={vi.fn()} loading />);
    expect(googleProps.current?.theme).toBe('filled_black');
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows the loading overlay with the light tint in light mode', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'real-client-id');
    withTheme('light', <GoogleSignInButton onCredential={vi.fn()} loading />);
    expect(googleProps.current?.theme).toBe('outline');
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('recomputes width on window resize and cleans up on unmount', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'real-client-id');
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = withTheme('light', <GoogleSignInButton onCredential={vi.fn()} />);
    fireEvent(window, new Event('resize'));
    expect(typeof googleProps.current?.width).toBe('number');
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    removeSpy.mockRestore();
  });
});
