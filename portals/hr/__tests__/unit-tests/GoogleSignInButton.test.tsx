import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import GoogleSignInButton from '../../src/components/GoogleSignInButton';
import { setGoogleClientId } from '@duncit/shell';
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
  setGoogleClientId('');
  localStorage.clear();
});

describe('GoogleSignInButton', () => {
  it('renders a configuration warning when no client id is set', () => {
    renderWithProviders(<GoogleSignInButton onCredential={vi.fn()} />);
    expect(screen.getByText(/google sign-in not configured/i)).toBeInTheDocument();
  });

  it('renders the Google button and forwards a credential (custom text)', () => {
    setGoogleClientId('real-client-id');
    const onCredential = vi.fn();
    renderWithProviders(<GoogleSignInButton onCredential={onCredential} text="continue_with" />);
    fireEvent.click(screen.getByTestId('glogin'));
    expect(onCredential).toHaveBeenCalledWith('id-token');
  });

  it('ignores a success response with no credential and a Google error', () => {
    setGoogleClientId('real-client-id');
    const onCredential = vi.fn();
    renderWithProviders(<GoogleSignInButton onCredential={onCredential} />);
    glogin.props.onSuccess({});
    glogin.props.onError();
    expect(onCredential).not.toHaveBeenCalled();
  });

  it('shows a light-mode loading overlay and recomputes width on resize', () => {
    setGoogleClientId('real-client-id');
    const { container } = renderWithProviders(<GoogleSignInButton onCredential={vi.fn()} loading />);
    expect(container.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
    fireEvent(window, new Event('resize'));
    expect(screen.getByTestId('glogin')).toBeInTheDocument();
  });

  it('renders the dark Google theme and dark loading overlay', () => {
    setGoogleClientId('real-client-id');
    const { container } = render(
      <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
        <GoogleSignInButton onCredential={vi.fn()} loading />
      </ThemeProvider>,
    );
    expect(glogin.props.theme).toBe('filled_black');
    expect(container.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
  });

  it('measures the host width when the container reports one', () => {
    setGoogleClientId('real-client-id');
    // The effect reads #google-signin-host clientWidth; the setup stub reports 800,
    // clamped to the 400 max — exercising the width-measurement branch.
    renderWithProviders(<GoogleSignInButton onCredential={vi.fn()} />);
    expect(glogin.props.width).toBe(400);
  });
});
