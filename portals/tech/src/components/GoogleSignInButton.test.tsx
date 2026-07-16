import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const g = vi.hoisted(() => ({ res: { credential: 'tok' } as { credential?: string } }));
vi.mock('@react-oauth/google', () => ({
  GoogleLogin: (p: { onSuccess: (r: { credential?: string }) => void; onError: () => void; theme: string }) => (
    <div>
      <span>gl-theme:{p.theme}</span>
      <button type="button" onClick={() => p.onSuccess(g.res)}>gl-success</button>
      <button type="button" onClick={() => p.onError()}>gl-error</button>
    </div>
  ),
}));

import GoogleSignInButton from './GoogleSignInButton';

afterEach(() => vi.unstubAllEnvs());

describe('GoogleSignInButton', () => {
  it('renders the not-configured fallback when the client id is missing', () => {
    render(<GoogleSignInButton onCredential={vi.fn()} />);
    expect(screen.getByText(/Google sign-in not configured/)).toBeInTheDocument();
  });

  it('renders the fallback for the placeholder client id', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'your_client_id_here');
    render(<GoogleSignInButton onCredential={vi.fn()} />);
    expect(screen.getByText(/Google sign-in not configured/)).toBeInTheDocument();
  });

  it('renders the SDK button (light theme) and forwards a credential', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'real-id');
    const onCredential = vi.fn();
    g.res = { credential: 'tok-123' };
    render(<GoogleSignInButton onCredential={onCredential} />);
    expect(screen.getByText('gl-theme:outline')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'gl-success' }));
    expect(onCredential).toHaveBeenCalledWith('tok-123');
    // window resize recomputes the width without throwing.
    fireEvent(window, new Event('resize'));
  });

  it('ignores a success without a credential and an onError', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'real-id');
    const onCredential = vi.fn();
    g.res = {};
    render(<GoogleSignInButton onCredential={onCredential} />);
    fireEvent.click(screen.getByRole('button', { name: 'gl-success' }));
    fireEvent.click(screen.getByRole('button', { name: 'gl-error' }));
    expect(onCredential).not.toHaveBeenCalled();
  });

  it('shows the loading overlay in the light theme', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'real-id');
    render(<GoogleSignInButton onCredential={vi.fn()} loading />);
    expect(screen.getByText('gl-theme:outline')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('uses the dark Google theme and shows the loading overlay', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'real-id');
    render(
      <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
        <GoogleSignInButton onCredential={vi.fn()} loading text="continue_with" />
      </ThemeProvider>,
    );
    expect(screen.getByText('gl-theme:filled_black')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
