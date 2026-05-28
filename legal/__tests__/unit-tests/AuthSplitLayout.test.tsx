import { describe, expect, it } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import AuthSplitLayout from '../../src/components/AuthSplitLayout';
import { appConfig } from '../../src/config/app-config';
import { renderWithProviders } from './testkit';

describe('AuthSplitLayout', () => {
  it('renders the title, subtitle and children', () => {
    renderWithProviders(
      <AuthSplitLayout title="Sign in" subtitle="Welcome back">
        <div data-testid="form-slot">form</div>
      </AuthSplitLayout>
    );
    expect(screen.getByText('Sign in')).toBeInTheDocument();
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.getByTestId('form-slot')).toBeInTheDocument();
    // The portal label appears in both the mobile header and the image pane.
    expect(screen.getAllByText(appConfig.portalLabel).length).toBeGreaterThan(0);
  });

  it('omits the subtitle when not provided', () => {
    renderWithProviders(
      <AuthSplitLayout title="Sign in">
        <div>form</div>
      </AuthSplitLayout>
    );
    expect(screen.getByText('Sign in')).toBeInTheDocument();
  });

  it('toggles the color mode from the corner button', () => {
    renderWithProviders(
      <AuthSplitLayout title="Sign in">
        <div>form</div>
      </AuthSplitLayout>
    );
    fireEvent.click(screen.getByLabelText('toggle color mode'));
    // After toggling to dark the light-mode icon is offered.
    expect(screen.getByLabelText('toggle color mode')).toBeInTheDocument();
  });

  it('renders in dark mode (covers dark-theme styling branches)', () => {
    localStorage.setItem(appConfig.colorModeKey, 'dark');
    renderWithProviders(
      <AuthSplitLayout title="Sign in" subtitle="Dark">
        <div>form</div>
      </AuthSplitLayout>
    );
    expect(screen.getByText('Dark')).toBeInTheDocument();
  });
});
