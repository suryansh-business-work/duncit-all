import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import DashboardPage from '../../src/pages/DashboardPage';
import { renderWithProviders } from '../testkit';

const mockConfig = vi.hoisted(() => ({
  name: 'Employee',
  tagline: 'Your profile, requests and workplace tools.',
  modules: [] as unknown[] | undefined,
}));
vi.mock('../../src/config/app-config', () => ({ appConfig: mockConfig }));

vi.mock('@duncit/shell', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/shell')>()),
  WelcomeDashboard: ({
    name,
    tagline,
    modules,
  }: {
    name: string;
    tagline: string;
    modules: readonly unknown[];
  }) => (
    <div data-testid="welcome" data-name={name} data-tagline={tagline} data-count={modules.length} />
  ),
}));

afterEach(() => {
  mockConfig.modules = [];
});

describe('DashboardPage', () => {
  it('passes the portal name, tagline and modules array through to WelcomeDashboard', () => {
    mockConfig.modules = [{ title: 'A' }];
    renderWithProviders(<DashboardPage />);
    const el = screen.getByTestId('welcome');
    expect(el).toHaveAttribute('data-name', 'Employee');
    expect(el).toHaveAttribute('data-tagline', 'Your profile, requests and workplace tools.');
    expect(el).toHaveAttribute('data-count', '1');
  });

  it('falls back to an empty modules array when appConfig.modules is undefined', () => {
    mockConfig.modules = undefined;
    renderWithProviders(<DashboardPage />);
    expect(screen.getByTestId('welcome')).toHaveAttribute('data-count', '0');
  });
});
