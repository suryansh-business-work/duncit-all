import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import ManualLogsTab from '@/components/ManualLogsTab';
import type { CrmActivity } from '@/api/crm.types';

const renderTab = (activities: CrmActivity[]) =>
  render(
    <MockedProvider mocks={[]}>
      <ManualLogsTab entityType="VENUE_LEAD" entityId="v-1" activities={activities} />
    </MockedProvider>
  );

describe('ManualLogsTab', () => {
  it('shows the empty state when there are no NOTE entries', () => {
    renderTab([]);
    expect(screen.getByText(/no manual logs in this window/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new log/i })).toBeInTheDocument();
  });

  it('ignores EMAIL / CALL activities and renders only NOTE entries', () => {
    renderTab([
      { type: 'EMAIL', summary: 'Sent intro', created_at: '2026-05-27T10:00:00.000Z' },
      {
        type: 'NOTE',
        summary: 'Customer called back',
        body_html: '<p>They confirmed Saturday slot.</p>',
        body_text: 'They confirmed Saturday slot.',
        created_at: '2026-05-27T10:30:00.000Z',
      },
    ]);
    // Empty state for "0 manual logs" should NOT appear (we have 1 NOTE).
    expect(screen.queryByText(/no manual logs in this window/i)).not.toBeInTheDocument();
    expect(screen.getByText('Customer called back')).toBeInTheDocument();
    expect(screen.getByText('They confirmed Saturday slot.')).toBeInTheDocument();
    // EMAIL entry should not show up.
    expect(screen.queryByText('Sent intro')).not.toBeInTheDocument();
  });

  it('renders the rich body via dangerouslySetInnerHTML so links survive', () => {
    renderTab([
      {
        type: 'NOTE',
        body_html: '<p>Read the <a href="https://duncit.com">brief</a>.</p>',
        body_text: 'Read the brief.',
        created_at: '2026-05-27T10:30:00.000Z',
      },
    ]);
    const link = screen.getByRole('link', { name: /brief/i }) as HTMLAnchorElement;
    expect(link.href).toContain('https://duncit.com');
  });
});
