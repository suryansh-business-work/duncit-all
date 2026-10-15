import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CONTACTS_PAGE } from '../../../analytics/src/pages/entity-analytics/pages';

const received = vi.hoisted(() => ({ page: null as unknown }));

// The page itself is the Analytics console's, proven by that console's suite
// (including the data-protection note it shows). What Marketing owns is WHICH
// page it mounts at /contacts.
vi.mock('../../../analytics/src/pages/entity-analytics/EntityAnalyticsPage', () => ({
  default: ({ page }: { page: { entity: string; dashboardId: string; note?: string } }) => {
    received.page = page;
    return <div data-testid="analytics-page">{`${page.entity}:${page.dashboardId}:${page.note}`}</div>;
  },
}));

import ContactsDashboardPage from '../../src/pages/contacts-page';

describe('Marketing > Contacts', () => {
  it('mounts the Analytics console’s own Contacts page, note and all', () => {
    render(<ContactsDashboardPage />);

    expect(screen.getByTestId('analytics-page')).toHaveTextContent(
      'CONTACTS:analytics.contacts:analytics.page.contacts.note'
    );
    // The same spec object, so a layout saved in one console is the layout in the other.
    expect(received.page).toBe(CONTACTS_PAGE);
  });
});
