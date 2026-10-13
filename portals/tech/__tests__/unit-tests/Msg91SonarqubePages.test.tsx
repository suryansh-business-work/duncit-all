import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const seen = vi.hoisted(() => ({ category: null as unknown, page: null as unknown }));

vi.mock('../../src/pages/environment/EnvVariablesTab', () => ({
  default: (p: { category?: string }) => {
    seen.category = p.category;
    return <div data-testid="env-tab" />;
  },
}));
vi.mock('../../../analytics/src/pages/entity-analytics/EntityAnalyticsPage', () => ({
  default: (p: { page: unknown }) => {
    seen.page = p.page;
    return <div data-testid="entity-analytics" />;
  },
}));
vi.mock('../../../analytics/src/pages/entity-analytics/pages', () => ({
  SONARQUBE_PAGE: { key: 'sonarqube' },
}));

import Msg91SettingsPage from '../../src/pages/msg91-settings';
import SonarqubePage from '../../src/pages/sonarqube';

describe('thin page wrappers', () => {
  it('MSG91 settings pins the environment editor to the MSG91 category under its own heading', () => {
    render(<Msg91SettingsPage />);
    expect(screen.getByTestId('env-tab')).toBeInTheDocument();
    expect(seen.category).toBe('MSG91');
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('SonarQube mounts the shared Analytics entity page with the SonarQube definition', () => {
    render(<SonarqubePage />);
    expect(screen.getByTestId('entity-analytics')).toBeInTheDocument();
    expect(seen.page).toEqual({ key: 'sonarqube' });
  });
});
