import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MaintenanceScreen, UnderDevelopmentScreen } from '../src/portal-mode/screens';

describe('MaintenanceScreen', () => {
  it('renders the app name in the maintenance copy', () => {
    render(<MaintenanceScreen appName="CRM" />);
    expect(screen.getByText(/We’ll be back soon/)).toBeInTheDocument();
    expect(screen.getByText(/CRM is temporarily down/)).toBeInTheDocument();
  });

  it('falls back to a generic subject', () => {
    render(<MaintenanceScreen />);
    expect(screen.getByText(/This service is temporarily down/)).toBeInTheDocument();
  });
});

describe('UnderDevelopmentScreen', () => {
  it('renders the app name in the development copy', () => {
    render(<UnderDevelopmentScreen appName="Ads" />);
    expect(screen.getByText('Under development')).toBeInTheDocument();
    expect(screen.getByText(/Ads is being built/)).toBeInTheDocument();
  });

  it('falls back to a generic subject', () => {
    render(<UnderDevelopmentScreen />);
    expect(screen.getByText(/This service is being built/)).toBeInTheDocument();
  });
});
