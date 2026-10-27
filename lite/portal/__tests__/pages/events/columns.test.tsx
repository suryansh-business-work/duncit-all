import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { setAmbientDateSettings } from '@duncit/app-settings';
import { EM_DASH, type DuncitColumn } from '@duncit/table';
import { SITE_URL } from '../../../../shared/env';
import type { LiteAdminEventRow } from '../../../graphql/events';
import { buildEventColumns, eventRowId } from '../../../pages/events/columns';
import { makeEventRow } from '../../fixtures';
import { portalT } from '../../test-utils';

beforeAll(() => setAmbientDateSettings({ dateFormat: 'yyyy-MM-dd', timeFormat: 'HH:mm', timeZone: 'UTC', timeZoneAware: true }));
afterAll(() => setAmbientDateSettings({}));

const ACTIONS = <span>row actions</span>;
const columns = buildEventColumns(portalT, () => ACTIONS);
const column = (field: string): DuncitColumn<LiteAdminEventRow> => {
  const found = columns.find((c) => c.field === field);
  if (!found) throw new Error(`no column ${field}`);
  return found;
};
const value = (field: string, row: LiteAdminEventRow) => column(field).valueGetter?.(row);

describe('event columns', () => {
  it('keys rows by id and heads the columns in English', () => {
    expect(eventRowId(makeEventRow())).toBe('ev-1');
    expect(columns.map((c) => c.headerName)).toEqual(['Title', 'Starts', 'Status', 'Visibility', 'City', 'Going', 'Featured', 'Hidden', 'Created', 'Actions']);
  });

  it('links the title to the public event page in a new tab', () => {
    render(<>{column('title').cellRenderer?.(makeEventRow())}</>);
    const link = screen.getByRole('link', { name: 'Open Jazz Night on the site' });
    expect(link).toHaveAttribute('href', `${SITE_URL}/e/jazz-night`);
    expect(link).toHaveTextContent('Jazz Night');
    expect(value('title', makeEventRow())).toBe('Jazz Night');
  });

  it("formats the start with the admin's date and time patterns, and the hidden created date", () => {
    expect(value('start_at', makeEventRow())).toBe('2026-03-15 · 14:30');
    expect(value('created_at', makeEventRow())).toBe('2026-02-01');
    expect(column('created_at').hide).toBe(true);
  });

  it('offers and exports the status and visibility in words', () => {
    expect(column('status')).toMatchObject({ type: 'enum', options: [{ value: 'DRAFT', label: 'Draft' }, { value: 'PUBLISHED', label: 'Published' }, { value: 'CANCELLED', label: 'Cancelled' }] });
    expect(value('status', makeEventRow({ status: 'CANCELLED' }))).toBe('Cancelled');
    expect(value('visibility', makeEventRow({ visibility: 'PRIVATE' }))).toBe('Private');
    render(<>{column('visibility').cellRenderer?.(makeEventRow({ visibility: 'UNLISTED' }))}</>);
    expect(screen.getByText('Unlisted')).toBeInTheDocument();
  });

  it('shows the city name or a dash for an online event', () => {
    expect(value('city_slug', makeEventRow())).toBe('Bengaluru');
    expect(value('city_slug', makeEventRow({ city_slug: null, city_name: null }))).toBe(EM_DASH);
  });

  it('reads the going count off the stats and never filters on it', () => {
    expect(value('going_count', makeEventRow({ stats: { going: 41 } }))).toBe(41);
    expect(column('going_count').filterable).toBe(false);
  });

  it('exports the featured and hidden flags as Yes / No and draws a warning chip for hidden', () => {
    expect(value('featured', makeEventRow({ featured: true }))).toBe('Yes');
    expect(value('hidden', makeEventRow({ hidden: false }))).toBe('No');
    render(<>{column('hidden').cellRenderer?.(makeEventRow({ hidden: true }))}</>);
    expect(screen.getByText('Yes').closest('.MuiChip-root')).toHaveClass('MuiChip-colorWarning');
  });

  it('hands the actions cell to the page', () => {
    render(<>{column('actions').cellRenderer?.(makeEventRow())}</>);
    expect(screen.getByText('row actions')).toBeInTheDocument();
  });
});
