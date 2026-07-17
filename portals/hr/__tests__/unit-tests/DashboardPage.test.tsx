import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import DashboardPage from '../../src/pages/DashboardPage';
import { appConfig } from '../../src/config/app-config';
import { renderWithProviders } from '../testkit';

const dash = vi.hoisted(() => ({ props: null as unknown as Record<string, any> }));

// Probe the shared WelcomeDashboard so we can assert the exact props the page
// forwards from the portal config.
vi.mock('@duncit/shell', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/shell')>();
  return {
    ...actual,
    WelcomeDashboard: (props: Record<string, any>) => {
      dash.props = props;
      return <div data-testid="welcome">{props.name}</div>;
    },
  };
});

describe('DashboardPage', () => {
  it('renders the shared welcome dashboard with the portal name, tagline and modules', () => {
    renderWithProviders(<DashboardPage />);
    expect(screen.getByTestId('welcome')).toHaveTextContent(appConfig.name);
    expect(dash.props.name).toBe(appConfig.name);
    expect(dash.props.tagline).toBe(appConfig.tagline);
    expect(dash.props.modules).toEqual(appConfig.modules ?? []);
  });
});
