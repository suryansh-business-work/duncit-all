import { describe, expect, it, vi, afterEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render } from '@testing-library/react';
import GoogleSignInButton from '../../src/components/GoogleSignInButton';

vi.mock('@react-oauth/google', () => ({
  GoogleLogin: ({ onSuccess, onError, theme, text }: any) => (
    <div data-testid="google-login" data-theme={theme} data-text={text}>
      <button type="button" onClick={() => onSuccess({ credential: 'id-token' })}>
        cred
      </button>
      <button type="button" onClick={() => onSuccess({ credential: '' })}>
        no-cred
      </button>
      <button type="button" onClick={() => onError()}>
        err
      </button>
    </div>
  ),
}));

const renderBtn = (props: Partial<Parameters<typeof GoogleSignInButton>[0]> = {}, mode: 'light' | 'dark' = 'light') =>
  render(
    <ThemeProvider theme={createTheme({ palette: { mode } })}>
      <GoogleSignInButton onCredential={props.onCredential ?? (() => undefined)} {...props} />
    </ThemeProvider>,
  );

afterEach(() => vi.unstubAllEnvs());

describe('GoogleSignInButton', () => {
  it('renders the not-configured fallback when no client id is set', () => {
    // No VITE_GOOGLE_CLIENT_ID → fallback box, effect finds no host element.
    renderBtn();
    expect(screen.getByText(/not configured/i)).toBeInTheDocument();
    fireEvent(window, new Event('resize'));
  });

  it('renders the fallback for the placeholder client id', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'your_client_id_here');
    renderBtn();
    expect(screen.getByText(/not configured/i)).toBeInTheDocument();
  });

  it('renders the Google button and forwards a credential', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'real-client-id');
    const onCredential = vi.fn();
    const { unmount } = renderBtn({ onCredential, loading: true });
    // resize recomputes width against the real host element
    fireEvent(window, new Event('resize'));

    fireEvent.click(screen.getByText('cred'));
    expect(onCredential).toHaveBeenCalledWith('id-token');

    fireEvent.click(screen.getByText('no-cred'));
    expect(onCredential).toHaveBeenCalledTimes(1); // empty credential ignored

    fireEvent.click(screen.getByText('err')); // onError no-op
    // loading overlay renders a spinner
    expect(document.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
    unmount(); // removes the resize listener
  });

  it('uses the dark Google theme and dark loading overlay in dark mode', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'real-client-id');
    renderBtn({ text: 'continue_with', loading: true }, 'dark');
    expect(screen.getByTestId('google-login')).toHaveAttribute('data-theme', 'filled_black');
    expect(screen.getByTestId('google-login')).toHaveAttribute('data-text', 'continue_with');
    expect(document.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
  });
});
