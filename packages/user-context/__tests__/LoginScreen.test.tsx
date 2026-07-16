import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PaletteMode } from '@mui/material';
import LoginScreen from '../src/login-screen/LoginScreen';
import type { LoginScreenConfig } from '../src/login-screen/login.types';

const fullConfig: LoginScreenConfig = {
  brandName: 'Duncit Finance',
  portalName: 'Finance',
  tagline: 'Money, moved.',
  promoTitle: 'Finance suite',
  promoText: 'Everything about payouts.',
  bgImage: 'https://img/bg.jpg',
  logoUrl: 'https://img/logo.png',
  privacyUrl: 'https://custom/privacy',
  termsUrl: 'https://custom/terms',
  contactEmail: 'support@x.co',
};

const minimalConfig: LoginScreenConfig = {
  brandName: 'Duncit Admin',
  portalName: 'Admin',
  tagline: 'Run the show.',
  promoTitle: 'Admin suite',
  promoText: 'Control everything.',
  bgImage: 'https://img/bg2.jpg',
  logoUrl: 'https://img/logo2.png',
};

function renderScreen(overrides: Partial<ComponentProps<typeof LoginScreen>> = {}) {
  const props: ComponentProps<typeof LoginScreen> = {
    config: fullConfig,
    mode: 'dark' as PaletteMode,
    onToggleMode: vi.fn(),
    onSubmit: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<LoginScreen {...props} />) };
}

describe('LoginScreen', () => {
  it('renders the card, error alert, footer and custom legal links in dark mode', () => {
    renderScreen({
      errorMessage: 'Bad credentials',
      footerSlot: <div>google-sign-in</div>,
    });
    expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.getByText('Bad credentials')).toBeInTheDocument();
    expect(screen.getByText('google-sign-in')).toBeInTheDocument();
    expect(screen.getByText('Money, moved.')).toBeInTheDocument();
    // Dark mode shows the "switch to light" control.
    expect(screen.getByTestId('LightModeIcon')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute(
      'href',
      'https://custom/privacy'
    );
    expect(screen.getByRole('link', { name: 'Terms of Use' })).toHaveAttribute(
      'href',
      'https://custom/terms'
    );
    expect(screen.getByRole('link', { name: 'support@x.co' })).toHaveAttribute(
      'href',
      'mailto:support@x.co'
    );
  });

  it('falls back to defaults and hides optional slots in light mode', () => {
    renderScreen({ config: minimalConfig, mode: 'light', errorMessage: null });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    // Light mode shows the "switch to dark" control.
    expect(screen.getByTestId('DarkModeIcon')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute(
      'href',
      'https://duncit.com/privacy-policy'
    );
    expect(screen.getByRole('link', { name: 'Terms of Use' })).toHaveAttribute(
      'href',
      'https://duncit.com/terms-of-use'
    );
    expect(screen.getByRole('link', { name: 'admin@duncit.com' })).toHaveAttribute(
      'href',
      'mailto:admin@duncit.com'
    );
  });

  it('invokes onToggleMode when the color-mode button is clicked', async () => {
    const { props } = renderScreen();
    await userEvent.click(screen.getByRole('button', { name: 'toggle color mode' }));
    expect(props.onToggleMode).toHaveBeenCalledTimes(1);
  });

  it('opens the forgot-password snackbar and dismisses it', async () => {
    renderScreen();
    await userEvent.click(screen.getByText('Forgot password?'));
    const msg = 'Contact your administrator to reset your password.';
    expect(await screen.findByText(msg)).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByText(msg)).not.toBeInTheDocument());
  });

  it('opens and closes the "Other portals" launcher', async () => {
    renderScreen();
    await userEvent.click(screen.getByRole('button', { name: 'Other portals' }));
    expect(await screen.findByText('One Duncit account — jump to any console below.')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(
        screen.queryByText('One Duncit account — jump to any console below.')
      ).not.toBeInTheDocument()
    );
  });
});
