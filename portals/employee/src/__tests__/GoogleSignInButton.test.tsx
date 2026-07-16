import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { afterEach, describe, expect, it, vi } from 'vitest';

let loginProps: {
  onSuccess: (r: { credential?: string }) => void;
  onError: () => void;
  theme: string;
  text: string;
  width: number;
};

vi.mock('@react-oauth/google', () => ({
  GoogleLogin: (props: typeof loginProps) => {
    loginProps = props;
    return <div data-testid="glogin" data-theme={props.theme} data-text={props.text} data-width={props.width} />;
  },
}));

import GoogleSignInButton from '../components/GoogleSignInButton';

const renderIn = (ui: React.ReactElement, mode: 'light' | 'dark' = 'light') =>
  render(<ThemeProvider theme={createTheme({ palette: { mode } })}>{ui}</ThemeProvider>);

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('GoogleSignInButton', () => {
  it('shows the not-configured fallback when the client id is unset', () => {
    // env var left unstubbed → undefined → optional-chaining short-circuits.
    renderIn(<GoogleSignInButton onCredential={vi.fn()} />);
    expect(screen.getByText(/not configured/i)).toBeInTheDocument();
    expect(screen.queryByTestId('glogin')).not.toBeInTheDocument();
  });

  it('shows the fallback for the placeholder client id', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'your_client_id_here');
    renderIn(<GoogleSignInButton onCredential={vi.fn()} />);
    expect(screen.getByText(/not configured/i)).toBeInTheDocument();
  });

  it('renders the Google button (outline theme in light mode) and forwards the credential', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'real-id');
    const onCredential = vi.fn();
    renderIn(<GoogleSignInButton onCredential={onCredential} text="continue_with" />);
    const btn = screen.getByTestId('glogin');
    expect(btn).toHaveAttribute('data-theme', 'outline');
    expect(btn).toHaveAttribute('data-text', 'continue_with');
    expect(btn).toHaveAttribute('data-width', '240');

    loginProps.onSuccess({ credential: 'id-token-1' });
    expect(onCredential).toHaveBeenCalledWith('id-token-1');
  });

  it('ignores a success response with no credential and swallows errors', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'real-id');
    const onCredential = vi.fn();
    renderIn(<GoogleSignInButton onCredential={onCredential} />);
    loginProps.onSuccess({});
    expect(onCredential).not.toHaveBeenCalled();
    expect(() => loginProps.onError()).not.toThrow();
  });

  it('uses the dark Google theme in dark mode and shows the loading overlay', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'real-id');
    renderIn(<GoogleSignInButton onCredential={vi.fn()} loading />, 'dark');
    expect(screen.getByTestId('glogin')).toHaveAttribute('data-theme', 'filled_black');
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows the loading overlay with the light-mode tint in light mode', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'real-id');
    renderIn(<GoogleSignInButton onCredential={vi.fn()} loading />, 'light');
    expect(screen.getByTestId('glogin')).toHaveAttribute('data-theme', 'outline');
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('keeps the default width when the host element is missing and re-measures on resize', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'real-id');
    const spy = vi.spyOn(document, 'getElementById').mockReturnValue(null);
    renderIn(<GoogleSignInButton onCredential={vi.fn()} />);
    expect(screen.getByTestId('glogin')).toHaveAttribute('data-width', '320');
    fireEvent(window, new Event('resize'));
    expect(spy).toHaveBeenCalled();
  });
});
