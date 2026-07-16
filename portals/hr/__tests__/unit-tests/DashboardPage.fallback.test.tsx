import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

const dash = vi.hoisted(() => ({ props: null as unknown as Record<string, any> }));

// Probe the shared WelcomeDashboard to capture the modules prop.
vi.mock('@duncit/shell', () => ({
  WelcomeDashboard: (props: Record<string, any>) => {
    dash.props = props;
    return <div data-testid="welcome" />;
  },
}));

// Config with no `modules` field, exercising the `appConfig.modules ?? []`
// fallback branch in DashboardPage.
vi.mock('../../src/config/app-config', () => ({
  appConfig: { name: 'HR', tagline: 'A tagline' },
}));

afterEach(() => {
  vi.resetModules();
});

describe('DashboardPage modules fallback', () => {
  it('passes an empty array when the config omits modules', async () => {
    const { default: DashboardPage } = await import('../../src/pages/DashboardPage');
    render(<DashboardPage />);
    expect(dash.props.modules).toEqual([]);
  });
});
