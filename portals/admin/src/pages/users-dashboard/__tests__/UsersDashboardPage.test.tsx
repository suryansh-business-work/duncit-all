import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { USERS_PAGE } from '../../../../../analytics/src/pages/entity-analytics/pages';
import UsersDashboardPage from '../UsersDashboardPage';

vi.mock('../../../../../analytics/src/pages/entity-analytics/EntityAnalyticsPage', () => ({
  default: ({ page }: { page: Record<string, unknown> }) => (
    <pre data-testid="entity-page">{JSON.stringify(page)}</pre>
  ),
}));

describe('UsersDashboardPage', () => {
  it('mounts the Analytics Users dashboard under Admin heading and path, keeping the shared layout id', () => {
    render(<UsersDashboardPage />);

    const page = JSON.parse(screen.getByTestId('entity-page').textContent ?? '{}');
    expect(page).toEqual({
      ...USERS_PAGE,
      path: '/users-dashboard',
      title: 'admin.usersDashboard.title',
      subtitle: 'admin.usersDashboard.subtitle',
    });
    expect(page.dashboardId).toBe('analytics.users');
    expect(page.entity).toBe('USERS');
  });
});
