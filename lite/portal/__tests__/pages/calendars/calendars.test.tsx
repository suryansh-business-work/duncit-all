import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GraphQLError } from 'graphql';
import { EM_DASH, type DuncitColumn } from '@duncit/table';
import { SITE_URL } from '../../../../shared/env';
import { LITE_ADMIN_CALENDARS_TABLE, LITE_ADMIN_SET_CALENDAR_FEATURED, type LiteAdminCalendarRow } from '../../../graphql/calendars';
import { CalendarsPage } from '../../../pages/calendars';
import { buildCalendarColumns, calendarRowId } from '../../../pages/calendars/columns';
import { makeCalendar } from '../../fixtures';
import { anyVariables, gqlCalendar, tablePage } from '../../gql-results';
import { findRow, findToast, portalT, renderWithProviders, type GqlMock } from '../../test-utils';

vi.mock('@duncit/table', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/table')>();
  const { FakeDuncitTable } = await import('../../fake-table');
  return { ...actual, DuncitTable: FakeDuncitTable };
});

const columns = buildCalendarColumns(portalT, () => <span>toggle</span>);
const column = (field: string): DuncitColumn<LiteAdminCalendarRow> => {
  const found = columns.find((c) => c.field === field);
  if (!found) throw new Error(`no column ${field}`);
  return found;
};
const value = (field: string, row: LiteAdminCalendarRow) => column(field).valueGetter?.(row);

describe('calendar columns', () => {
  it('keys rows by id and heads the columns in English', () => {
    expect(calendarRowId(makeCalendar())).toBe('cal-1');
    expect(columns.map((c) => c.headerName)).toEqual(['Name', 'Owner', 'City', 'Subscribers', 'Featured', 'Created', 'Actions']);
  });

  it('links the name to the public calendar page', () => {
    render(<>{column('name').cellRenderer?.(makeCalendar())}</>);
    expect(screen.getByRole('link', { name: 'Open Indie Gigs on the site' })).toHaveAttribute('href', `${SITE_URL}/cal/indie-gigs`);
    expect(value('name', makeCalendar())).toBe('Indie Gigs');
  });

  it('shows the owner with their handle, the city or a dash, and the featured flag in words', () => {
    expect(value('owner.name', makeCalendar())).toBe('Meera Iyer (@meera)');
    expect(value('city_slug', makeCalendar({ city_slug: null, city_name: null }))).toBe(EM_DASH);
    expect(value('featured', makeCalendar({ featured: true }))).toBe('Featured');
    expect(value('featured', makeCalendar({ featured: false }))).toBe('Not featured');
  });
});

const calendarsTable = (rows: LiteAdminCalendarRow[]): GqlMock => ({
  request: { query: LITE_ADMIN_CALENDARS_TABLE, variables: anyVariables },
  result: { data: { liteAdminCalendarsTable: tablePage('LiteAdminCalendarsPage', rows.map(gqlCalendar)) } },
  maxUsageCount: Number.POSITIVE_INFINITY,
});

describe('CalendarsPage', () => {
  it('features a calendar on Discover from its star', async () => {
    const user = userEvent.setup();
    const row = makeCalendar();
    const feature: GqlMock = {
      request: { query: LITE_ADMIN_SET_CALENDAR_FEATURED, variables: { id: 'cal-1', featured: true } },
      result: { data: { liteAdminSetCalendarFeatured: gqlCalendar({ ...row, featured: true }) } },
    };
    renderWithProviders(<CalendarsPage />, { mocks: [calendarsTable([row]), feature] });
    expect(screen.getByRole('heading', { level: 1, name: 'Calendars' })).toBeInTheDocument();
    const star = (await findRow('cal-1')).getByRole('button', { name: 'Feature Indie Gigs' });
    expect(star).toHaveAttribute('aria-pressed', 'false');
    await user.click(star);
    expect(await findToast('success')).toHaveTextContent('Indie Gigs is now featured on Discover');
  });

  it('removes a featured calendar from Discover', async () => {
    const user = userEvent.setup();
    const row = makeCalendar({ featured: true });
    const unfeature: GqlMock = {
      request: { query: LITE_ADMIN_SET_CALENDAR_FEATURED, variables: { id: 'cal-1', featured: false } },
      result: { data: { liteAdminSetCalendarFeatured: gqlCalendar({ ...row, featured: false }) } },
    };
    renderWithProviders(<CalendarsPage />, { mocks: [calendarsTable([row]), unfeature] });
    const star = (await findRow('cal-1')).getByRole('button', { name: 'Remove Indie Gigs from featured' });
    expect(star).toHaveAttribute('aria-pressed', 'true');
    await user.click(star);
    expect(await findToast('success')).toHaveTextContent('Indie Gigs is no longer featured');
  });

  it("reports the API's refusal", async () => {
    const user = userEvent.setup();
    const refused: GqlMock = { request: { query: LITE_ADMIN_SET_CALENDAR_FEATURED, variables: { id: 'cal-1', featured: true } }, result: { errors: [new GraphQLError('Calendar has no upcoming events')] } };
    renderWithProviders(<CalendarsPage />, { mocks: [calendarsTable([makeCalendar()]), refused] });
    await user.click((await findRow('cal-1')).getByRole('button', { name: 'Feature Indie Gigs' }));
    expect(await findToast('error')).toHaveTextContent('Calendar has no upcoming events');
  });

  it('shows the empty copy when no calendars exist', async () => {
    renderWithProviders(<CalendarsPage />, { mocks: [calendarsTable([])] });
    expect(await screen.findByTestId('table-empty')).toHaveTextContent('No calendars yet.');
  });
});
