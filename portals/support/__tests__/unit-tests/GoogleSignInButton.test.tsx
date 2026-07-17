import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import GoogleSignInButton from '../../src/components/GoogleSignInButton';
import { renderWithProviders } from '../testkit';

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

  it('uses the light Google theme + overlay and recomputes width on resize', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'real-client-id');
    const light = createTheme({ palette: { mode: 'light' } });
    const { container } = render(
      <ThemeProvider theme={light}>
        <GoogleSignInButton onCredential={vi.fn()} loading />
      </ThemeProvider>,
    );
    // Light branch of the theme prop (line 68) + light overlay background (line 83).
    expect(glogin.props.theme).toBe('outline');
    expect(container.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
    fireEvent(window, new Event('resize'));
    expect(screen.getByTestId('glogin')).toBeInTheDocument();
  });

  it('uses the dark Google theme + overlay when the MUI palette is dark', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'real-client-id');
    const dark = createTheme({ palette: { mode: 'dark' } });
    const { container } = render(
      <ThemeProvider theme={dark}>
        <GoogleSignInButton onCredential={vi.fn()} loading />
      </ThemeProvider>,
    );
    // Dark branch of the theme prop (line 68) + dark overlay background (line 83).
    expect(glogin.props.theme).toBe('filled_black');
    expect(container.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
  });
});
