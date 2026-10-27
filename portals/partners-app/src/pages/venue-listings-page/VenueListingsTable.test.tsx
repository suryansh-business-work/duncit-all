import '../../../__tests__/helpers/agGridEnv';
import '../../__tests__/groupC-wide-grid';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, screen, within } from '@testing-library/react';
import VenueListingsTable from './VenueListingsTable';
import { renderWithProviders } from '../../__tests__/render';
import { scriptedLink, type ScriptedAnswer } from '../../__tests__/groupC-link';

beforeEach(() => {
  globalThis.localStorage.clear();
});
afterEach(cleanup);

const row = (over: Record<string, unknown> = {}) => ({
  __typename: 'Venue',
  id: 'v1',
  status: 'APPROVED',
  venue_name: 'Cafe Mocha',
  venue_type: 'Cafe',
  city: 'Pune',
  locality: 'Baner',
  capacity: 40,
  cover_image_url: 'https://cdn.duncit.com/mocha.jpg',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-02T00:00:00.000Z',
  ...over,
});

const mount = (rows: unknown[], answers: Record<string, ScriptedAnswer> = {}) =>
  renderWithProviders(<VenueListingsTable />, {
    link: scriptedLink({ MyVenuesTable: { myVenuesTable: { __typename: 'VenueTablePage', total: rows.length, rows } }, ...answers }),
  });

const rowOf = async (name: string) => within((await screen.findByText(name)).closest('[role="row"]') as HTMLElement);

describe('VenueListingsTable', () => {
  it('lists each registration with its type, city and capacity', async () => {
    mount([row()]);
    const venue = await rowOf('Cafe Mocha');
    expect(venue.getByText('Cafe · Pune')).toBeTruthy();
    expect(venue.getByText('40')).toBeTruthy();
    expect(screen.getByText('Your venue registrations')).toBeTruthy();
  });

  it('sends an approved venue to its availability and to a read-only view', async () => {
    mount([row()]);
    const hrefs = (await rowOf('Cafe Mocha')).getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')]);
    expect(hrefs).toEqual([
      ['Availability', '/venues/v1/availability'],
      ['View', '/register-venue/v1'],
    ]);
  });

  it('lets a submitted venue be viewed but not given availability', async () => {
    mount([row({ id: 'v2', status: 'SUBMITTED', venue_name: 'Under Review Hall' })]);
    const links = (await rowOf('Under Review Hall')).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual(['View']);
  });

  it('offers a rejected venue Edit & resubmit and a draft plain Edit', async () => {
    mount([
      row({ id: 'v3', status: 'REJECTED', venue_name: 'Rejected Hall' }),
      row({ id: 'v4', status: 'DRAFT', venue_name: 'Draft Hall' }),
    ]);
    expect((await rowOf('Rejected Hall')).getByRole('link', { name: 'Edit & resubmit' }).getAttribute('href')).toBe(
      '/register-venue/v3',
    );
    expect((await rowOf('Draft Hall')).getByRole('link', { name: 'Edit' }).getAttribute('href')).toBe('/register-venue/v4');
  });

  it('names a half-filled draft with placeholders instead of blanks', async () => {
    mount([
      row({
        id: 'v5',
        status: 'DRAFT',
        venue_name: null,
        venue_type: null,
        city: null,
        capacity: null,
        cover_image_url: null,
        updated_at: null,
        created_at: null,
      }),
    ]);
    const venue = await rowOf('Untitled venue');
    expect(venue.getByText('Venue · City pending')).toBeTruthy();
    expect(venue.getAllByText('Not available').length).toBeGreaterThanOrEqual(1);
  });

  it('shows the empty table when the partner has registered no venue', async () => {
    mount([]);
    expect(await screen.findByText('Your venue registrations')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'View' })).toBeNull();
  });
});
