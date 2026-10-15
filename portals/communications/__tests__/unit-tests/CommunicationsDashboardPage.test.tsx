import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { COMMUNICATIONS_PAGE } from '../../../analytics/src/pages/entity-analytics/pages';

const received = vi.hoisted(() => ({ page: null as unknown }));

// The page itself is the Analytics console's, proven by that console's suite.
// What this console owns is WHICH page it mounts at its Dashboard.
vi.mock('../../../analytics/src/pages/entity-analytics/EntityAnalyticsPage', () => ({
  default: ({ page }: { page: { entity: string; dashboardId: string } }) => {
    received.page = page;
    return <div data-testid="analytics-page">{`${page.entity}:${page.dashboardId}`}</div>;
  },
}));

import CommunicationsDashboardPage from '../../src/pages/dashboard';

describe('Communications Dashboard', () => {
  it('mounts the Analytics console’s own Communications page, not a copy of it', () => {
    render(<CommunicationsDashboardPage />);

    expect(screen.getByTestId('analytics-page')).toHaveTextContent('COMMUNICATIONS:analytics.communications');
    // The same spec object, so a layout saved in one console is the layout in the other.
    expect(received.page).toBe(COMMUNICATIONS_PAGE);
  });
});
