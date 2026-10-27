import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route, useLocation } from 'react-router';
import type { PortMapOverview, PortMapRoute } from '@duncit/gql-types';
import { renderWithProviders } from '../testkit';
import { ops, resetOps } from '../mocks/ops';

vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));

import PortMappingPage from '../../src/pages/domain/port-mapping';

const route = (over: Partial<PortMapRoute> = {}): PortMapRoute => ({
  __typename: 'PortMapRoute',
  site: 'duncit',
  enabled: true,
  domain: 'api.example.test',
  location: '/',
  target: 'http://127.0.0.1:2001',
  host: '127.0.0.1',
  port: 2001,
  tls: true,
  ...over,
});

const overview = (over: Partial<PortMapOverview> = {}): PortMapOverview => ({
  __typename: 'PortMapOverview',
  available: true,
  error: null,
  checked_at: '2026-10-20T10:00:00.000Z',
  sites: [
    { __typename: 'PortMapSite', name: 'duncit', enabled: true, domain_count: 2 },
    { __typename: 'PortMapSite', name: 'legacy', enabled: false, domain_count: 1 },
  ],
  routes: [
    route(),
    route({ domain: 'app.example.test', port: 2002, target: 'http://127.0.0.1:2002', tls: false }),
    route({ site: 'legacy', domain: 'old.example.test', port: 3001, target: 'http://127.0.0.1:3001', enabled: false }),
  ],
  ...over,
});

function Search() {
  return <span data-testid="search">{useLocation().search}</span>;
}

const mount = (entry = '/port-mapping') =>
  renderWithProviders(<></>, {
    initialEntries: [entry],
    routes: (
      <Route
        path="/port-mapping"
        element={
          <>
            <PortMappingPage />
            <Search />
          </>
        }
      />
    ),
  });

beforeEach(() => {
  resetOps();
  ops.q = { PortMappings: { data: { portMappings: overview() } } };
});

describe('Port mapping page', () => {
  it('draws every domain and the port nginx hands it to, and says when it was read', async () => {
    mount();

    expect(await screen.findByTestId('port-map-canvas')).toBeInTheDocument();
    expect(await screen.findByTestId('port-map-domain-api.example.test')).toHaveTextContent('api.example.test');
    expect(screen.getByTestId('port-map-port-127.0.0.1:2001')).toHaveTextContent('Port 2001');
    expect(screen.getByTestId('port-map-domain-old.example.test')).toHaveTextContent('Site not enabled in nginx');
    expect(screen.getByTestId('port-map-domain-app.example.test')).not.toHaveTextContent('Site not enabled in nginx');
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeEnabled();
  });

  it('refetches from the header', async () => {
    const refetch = vi.fn().mockResolvedValue({});
    ops.q.PortMappings = { data: { portMappings: overview() }, refetch };
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Refresh' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('disables refresh while loading and shows no map until the first answer', () => {
    ops.q.PortMappings = { loading: true };
    mount();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeDisabled();
    expect(screen.queryByTestId('port-map-canvas')).not.toBeInTheDocument();
  });

  it('shows the read error instead of the map', () => {
    ops.q.PortMappings = { error: new Error('nginx unreachable') };
    mount();
    expect(screen.getByText('nginx unreachable')).toBeInTheDocument();
    expect(screen.queryByTestId('port-map-canvas')).not.toBeInTheDocument();
  });

  it('warns with the server reason when the vhosts cannot be read', () => {
    ops.q.PortMappings = { data: { portMappings: overview({ available: false, error: 'permission denied' }) } };
    mount();
    expect(screen.getByTestId('port-map-unavailable')).toHaveTextContent('permission denied');
    expect(screen.queryByTestId('port-map-canvas')).not.toBeInTheDocument();
  });

  it('warns even when the server gave no reason', () => {
    ops.q.PortMappings = { data: { portMappings: overview({ available: false, error: null }) } };
    mount();
    expect(screen.getByTestId('port-map-unavailable')).toBeInTheDocument();
  });

  it('says there is nothing to draw when there are no routes', async () => {
    ops.q.PortMappings = { data: { portMappings: overview({ routes: [] }) } };
    mount();
    expect(await screen.findByTestId('port-map-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('port-map-canvas')).not.toBeInTheDocument();
  });

  it('narrows the map to one sites-available file, offering only that file domains', async () => {
    mount('/port-mapping?site=legacy');

    expect(await screen.findByTestId('port-map-domain-old.example.test')).toBeInTheDocument();
    expect(screen.queryByTestId('port-map-domain-api.example.test')).not.toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Domain' }));
    const options = within(await screen.findByRole('listbox')).getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual(['old.example.test']);
  });

  it('writes the chosen site into the URL, and clears it again for every file', async () => {
    mount();
    await screen.findByTestId('port-map-canvas');

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Site file' }));
    fireEvent.click(await screen.findByRole('option', { name: /legacy/ }));
    await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent('site=legacy'));
    expect(screen.queryByTestId('port-map-domain-api.example.test')).not.toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Site file' }));
    fireEvent.click(await screen.findByRole('option', { name: 'All site files' }));
    await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent(/^$/));
    expect(await screen.findByTestId('port-map-domain-api.example.test')).toBeInTheDocument();
  });

  it('picks a domain from the filter and writes it into the URL', async () => {
    mount();
    await screen.findByTestId('port-map-canvas');

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Domain' }));
    fireEvent.click(await screen.findByRole('option', { name: 'old.example.test' }));

    await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent('domain=old.example.test'));
    expect(screen.queryByTestId('port-map-domain-api.example.test')).not.toBeInTheDocument();
  });

  it('narrows to one domain from the filter, and back from the clear button', async () => {
    mount('/port-mapping?domain=app.example.test');

    expect(await screen.findByTestId('port-map-domain-app.example.test')).toBeInTheDocument();
    expect(screen.queryByTestId('port-map-domain-api.example.test')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Clear'));
    await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent(/^$/));
    expect(await screen.findByTestId('port-map-domain-api.example.test')).toBeInTheDocument();
  });

  it('narrows the map to a domain when its card is clicked', async () => {
    mount();
    fireEvent.click(await screen.findByTestId('port-map-domain-app.example.test'));

    await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent('domain=app.example.test'));
    expect(screen.queryByTestId('port-map-domain-api.example.test')).not.toBeInTheDocument();
  });

  it('leaves the map alone when a port card is clicked', async () => {
    mount();
    fireEvent.click(await screen.findByTestId('port-map-port-127.0.0.1:2001'));

    expect(screen.getByTestId('search')).toHaveTextContent(/^$/);
    expect(screen.getByTestId('port-map-domain-api.example.test')).toBeInTheDocument();
  });

  it('labels a route with no port by its raw target', async () => {
    ops.q.PortMappings = {
      data: {
        portMappings: overview({ routes: [route({ port: null, host: null, target: 'http://unix:/run/app.sock' })] }),
      },
    };
    mount();
    expect(await screen.findByTestId('port-map-port-http://unix:/run/app.sock')).toHaveTextContent('No fixed port');
  });
});
