import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GraphQLError } from 'graphql';
import { LITE_ADMIN_CITIES, LITE_DELETE_CITY, LITE_UPSERT_CITY } from '../../../graphql/catalogue';
import { CitiesPage } from '../../../pages/cities';
import { makeCity } from '../../fixtures';
import { gqlCity } from '../../gql-results';
import { findConfirm, findRow, findToast, renderWithProviders, type GqlMock } from '../../test-utils';

vi.mock('@duncit/table', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/table')>();
  const { FakeDuncitTable } = await import('../../fake-table');
  return { ...actual, DuncitTable: FakeDuncitTable };
});

const blr = makeCity();
const pune = makeCity({ id: 'city-2', name: 'Pune', slug: 'pune', country: 'India', cover_url: null, featured: false, sort_order: 0, events_count: 0 });

const citiesQuery = (cities = [blr]): GqlMock => ({ request: { query: LITE_ADMIN_CITIES }, result: { data: { liteCities: cities.map(gqlCity) } } });

describe('CitiesPage', () => {
  it('lists every city, inactive ones included, under the page header', async () => {
    renderWithProviders(<CitiesPage />, { mocks: [citiesQuery()] });
    expect(screen.getByRole('heading', { level: 1, name: 'Cities' })).toBeInTheDocument();
    const row = await findRow('city-1');
    expect(row.getByText('Bengaluru')).toBeInTheDocument();
    expect(row.getByText('India')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Cities' })).toBeInTheDocument();
  });

  it('adds a city, confirms it, closes the dialog and shows the reloaded list', async () => {
    const user = userEvent.setup();
    const upsert: GqlMock = {
      request: {
        query: LITE_UPSERT_CITY,
        variables: { id: null, input: { name: 'Pune', slug: null, country: 'India', region: 'ASIA_PACIFIC', cover_url: null, featured: false, sort_order: 0, is_active: true } },
      },
      result: { data: { liteUpsertCity: gqlCity(pune) } },
    };
    renderWithProviders(<CitiesPage />, { mocks: [citiesQuery(), upsert, citiesQuery([blr, pune])] });

    await user.click(await screen.findByTestId('city-add'));
    const dialog = within(await screen.findByRole('dialog', { name: 'New city' }));
    await user.type(dialog.getByTestId('city-name'), 'Pune');
    await user.type(dialog.getByTestId('city-country'), 'India');
    await user.click(dialog.getByTestId('city-dialog-submit'));

    expect(await findToast('success')).toHaveTextContent('Pune saved');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'New city' })).not.toBeInTheDocument());
    expect((await findRow('city-2')).getByText('Pune')).toBeInTheDocument();
  });

  it('edits the clicked city by its id', async () => {
    const user = userEvent.setup();
    const upsert: GqlMock = {
      request: {
        query: LITE_UPSERT_CITY,
        variables: { id: 'city-1', input: { name: 'Bangalore', slug: 'bengaluru', country: 'India', region: 'ASIA_PACIFIC', cover_url: 'https://img.example.com/blr.jpg', featured: true, sort_order: 3, is_active: true } },
      },
      result: { data: { liteUpsertCity: gqlCity({ ...blr, name: 'Bangalore' }) } },
    };
    renderWithProviders(<CitiesPage />, { mocks: [citiesQuery(), upsert, citiesQuery([{ ...blr, name: 'Bangalore' }])] });

    await user.click((await findRow('city-1')).getByRole('button', { name: 'Edit Bengaluru' }));
    const name = await screen.findByTestId('city-name');
    await user.clear(name);
    await user.type(name, 'Bangalore');
    await user.click(screen.getByTestId('city-dialog-submit'));

    expect(await findToast('success')).toHaveTextContent('Bangalore saved');
  });

  it("keeps the dialog open with the API's message when the save is refused", async () => {
    const user = userEvent.setup();
    const upsert: GqlMock = {
      request: { query: LITE_UPSERT_CITY, variables: { id: null, input: { name: 'Pune', slug: null, country: null, region: 'ASIA_PACIFIC', cover_url: null, featured: false, sort_order: 0, is_active: true } } },
      result: { errors: [new GraphQLError('A city with this slug already exists')] },
    };
    renderWithProviders(<CitiesPage />, { mocks: [citiesQuery(), upsert] });

    await user.click(await screen.findByTestId('city-add'));
    await user.type(await screen.findByTestId('city-name'), 'Pune');
    await user.click(screen.getByTestId('city-dialog-submit'));

    expect(await findToast('error')).toHaveTextContent('A city with this slug already exists');
    expect(screen.getByRole('dialog', { name: 'New city' })).toBeInTheDocument();
  });

  it('deletes only after the admin confirms', async () => {
    const user = userEvent.setup();
    const remove = vi.fn(() => ({ data: { liteDeleteCity: true } }));
    const deleteMock: GqlMock = { request: { query: LITE_DELETE_CITY, variables: { id: 'city-1' } }, result: remove };
    renderWithProviders(<CitiesPage />, { mocks: [citiesQuery(), deleteMock, citiesQuery([])] });

    const row = await findRow('city-1');
    await user.click(row.getByRole('button', { name: 'Delete Bengaluru' }));
    const confirm = within(await findConfirm());
    expect(confirm.getByText('Delete Bengaluru?')).toBeInTheDocument();
    expect(confirm.getByText('Events in it keep working but lose the city.')).toBeInTheDocument();
    await user.click(confirm.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument());
    expect(remove).not.toHaveBeenCalled();

    await user.click(row.getByRole('button', { name: 'Delete Bengaluru' }));
    await user.click(within(await findConfirm()).getByRole('button', { name: 'Delete' }));
    expect(await findToast('success')).toHaveTextContent('Bengaluru deleted');
    expect(remove).toHaveBeenCalledTimes(1);
    expect(await screen.findByTestId('table-empty')).toHaveTextContent('No cities yet. Add the first one.');
  });

  it('shows the load error in place of the table', async () => {
    renderWithProviders(<CitiesPage />, { mocks: [{ request: { query: LITE_ADMIN_CITIES }, error: new Error('Cities are unavailable') }] });
    expect(await screen.findByTestId('query-guard-error')).toHaveTextContent('Cities are unavailable');
    expect(screen.queryByTestId('city-add')).not.toBeInTheDocument();
  });
});
