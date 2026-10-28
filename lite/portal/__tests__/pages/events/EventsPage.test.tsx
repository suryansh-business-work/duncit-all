import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GraphQLError } from 'graphql';
import type { LiteAdminEventRow } from '../../../graphql/events';
import { LITE_ADMIN_CANCEL_EVENT, LITE_ADMIN_EVENTS_TABLE, LITE_ADMIN_SET_EVENT_FLAGS } from '../../../graphql/events';
import { EventsPage } from '../../../pages/events';
import { makeEventRow } from '../../fixtures';
import { gqlEventRow, tablePage } from '../../gql-results';
import { findRow, findToast, renderWithProviders, type GqlMock } from '../../test-utils';

vi.mock('@duncit/table', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/table')>();
  const { FakeDuncitTable } = await import('../../fake-table');
  return { ...actual, DuncitTable: FakeDuncitTable };
});

interface TableVars {
  query?: { sort_by?: string | null; sort_dir?: string };
}

/** Answers the newest-first request the page makes, as often as the grid reloads. */
const eventsTable = (rows: LiteAdminEventRow[]): GqlMock => ({
  request: { query: LITE_ADMIN_EVENTS_TABLE, variables: (vars: TableVars) => vars.query?.sort_by === 'start_at' && vars.query.sort_dir === 'desc' },
  result: { data: { liteAdminEventsTable: tablePage('LiteAdminEventsPage', rows.map(gqlEventRow)) } },
  maxUsageCount: Number.POSITIVE_INFINITY,
});

const flags = (variables: Record<string, unknown>, row: LiteAdminEventRow): GqlMock => ({
  request: { query: LITE_ADMIN_SET_EVENT_FLAGS, variables },
  result: { data: { liteAdminSetEventFlags: gqlEventRow(row) } },
});

const cancelled = (reason: string | null) => ({ ...gqlEventRow(makeEventRow({ status: 'CANCELLED' })), cancelled_at: '2026-03-14T10:00:00.000Z', cancel_reason: reason });

describe('EventsPage', () => {
  it('lists the events newest first under the page header', async () => {
    renderWithProviders(<EventsPage />, { mocks: [eventsTable([makeEventRow()])] });
    expect(screen.getByRole('heading', { level: 1, name: 'Events' })).toBeInTheDocument();
    expect((await findRow('ev-1')).getByRole('link', { name: 'Open Jazz Night on the site' })).toBeInTheDocument();
  });

  it.each([
    [{ featured: false }, 'Feature Jazz Night', { id: 'ev-1', featured: true }, 'Jazz Night is now featured'],
    [{ featured: true }, 'Remove Jazz Night from featured', { id: 'ev-1', featured: false }, 'Jazz Night is no longer featured'],
    [{ hidden: false }, 'Hide Jazz Night', { id: 'ev-1', hidden: true }, 'Jazz Night is hidden from the app'],
    [{ hidden: true }, 'Show Jazz Night', { id: 'ev-1', hidden: false }, 'Jazz Night is visible again'],
  ])('flips one flag from %o via "%s"', async (over, button, variables, toast) => {
    const user = userEvent.setup();
    const row = makeEventRow(over);
    renderWithProviders(<EventsPage />, { mocks: [eventsTable([row]), flags(variables, row)] });
    await user.click((await findRow('ev-1')).getByRole('button', { name: button }));
    expect(await findToast('success')).toHaveTextContent(toast);
  });

  it("reports the API's refusal to change a flag", async () => {
    const user = userEvent.setup();
    renderWithProviders(<EventsPage />, {
      mocks: [eventsTable([makeEventRow()]), { request: { query: LITE_ADMIN_SET_EVENT_FLAGS, variables: { id: 'ev-1', featured: true } }, result: { errors: [new GraphQLError('Drafts cannot be featured')] } }],
    });
    await user.click((await findRow('ev-1')).getByRole('button', { name: 'Feature Jazz Night' }));
    expect(await findToast('error')).toHaveTextContent('Drafts cannot be featured');
  });

  it('cancels an event with the reason given and closes the dialog', async () => {
    const user = userEvent.setup();
    const cancel: GqlMock = { request: { query: LITE_ADMIN_CANCEL_EVENT, variables: { id: 'ev-1', reason: 'Venue flooded' } }, result: { data: { liteAdminCancelEvent: cancelled('Venue flooded') } } };
    renderWithProviders(<EventsPage />, { mocks: [eventsTable([makeEventRow()]), cancel] });
    await user.click((await findRow('ev-1')).getByRole('button', { name: 'Cancel Jazz Night' }));
    await user.type(await screen.findByTestId('cancel-event-reason'), 'Venue flooded');
    await user.click(screen.getByTestId('cancel-event-dialog-submit'));
    expect(await findToast('success')).toHaveTextContent('Jazz Night is cancelled');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Cancel this event?' })).not.toBeInTheDocument());
  });

  it('sends no reason at all when the box is left empty', async () => {
    const user = userEvent.setup();
    const cancel: GqlMock = { request: { query: LITE_ADMIN_CANCEL_EVENT, variables: { id: 'ev-1', reason: null } }, result: { data: { liteAdminCancelEvent: cancelled(null) } } };
    renderWithProviders(<EventsPage />, { mocks: [eventsTable([makeEventRow()]), cancel] });
    await user.click((await findRow('ev-1')).getByRole('button', { name: 'Cancel Jazz Night' }));
    await user.click(await screen.findByTestId('cancel-event-dialog-submit'));
    expect(await findToast('success')).toHaveTextContent('Jazz Night is cancelled');
  });

  it('keeps the dialog open when the cancel is refused, and closes it from Cancel', async () => {
    const user = userEvent.setup();
    const cancel: GqlMock = { request: { query: LITE_ADMIN_CANCEL_EVENT, variables: { id: 'ev-1', reason: null } }, result: { errors: [new GraphQLError('The event already ended')] } };
    renderWithProviders(<EventsPage />, { mocks: [eventsTable([makeEventRow()]), cancel] });
    await user.click((await findRow('ev-1')).getByRole('button', { name: 'Cancel Jazz Night' }));
    await user.click(await screen.findByTestId('cancel-event-dialog-submit'));
    expect(await findToast('error')).toHaveTextContent('The event already ended');
    expect(screen.getByRole('dialog', { name: 'Cancel this event?' })).toBeInTheDocument();
    await user.click(screen.getByTestId('cancel-event-dialog-cancel'));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Cancel this event?' })).not.toBeInTheDocument());
  });
});
