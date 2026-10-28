import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const seen = vi.hoisted(() => ({ page: null as unknown }));

vi.mock('../../../analytics/src/pages/entity-analytics/EntityAnalyticsPage', () => ({
  default: (p: { page: unknown }) => {
    seen.page = p.page;
    return <div data-testid="entity-analytics" />;
  },
}));
vi.mock('../../../analytics/src/pages/entity-analytics/pages', () => ({
  SONARQUBE_PAGE: { key: 'sonarqube' },
}));

import SonarqubePage from '../../src/pages/sonarqube';

describe('thin page wrappers', () => {
  it('SonarQube mounts the shared Analytics entity page with the SonarQube definition', () => {
    render(<SonarqubePage />);
    expect(screen.getByTestId('entity-analytics')).toBeInTheDocument();
    expect(seen.page).toEqual({ key: 'sonarqube' });
  });
});
