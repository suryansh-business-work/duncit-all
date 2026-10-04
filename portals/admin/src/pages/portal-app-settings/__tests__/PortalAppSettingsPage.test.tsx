import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../../../__tests__/testkit';
import PortalAppSettingsPage from '..';
import { PORTAL_APP_TABLE, SET_PORTAL_APP_FEATURES } from '../queries';

/** Grid stub with a fetch that round-trips through the suite's MockedProvider. */
vi.mock('@duncit/table', async (importOriginal) => {
  const stub = await import('../../location-subscriptions/__tests__/table-mock');
  return {
    ...(await importOriginal<typeof import('@duncit/table')>()),
    DuncitTable: stub.DuncitTable,
    useApolloTableFetch: stub.useApolloTableFetch,
  };
});

const portal = (over: Record<string, unknown>) => ({
  __typename: 'PortalMode',
  key: 'finance',
  name: 'Finance',
  kind: 'PORTAL',
  url: 'https://finance.duncit.com/',
  chat_enabled: true,
  apps_enabled: false,
  ...over,
});

const FINANCE = portal({});
const WEBSITE = portal({ key: 'website', name: 'Website', kind: 'WEBSITE', url: null });

const tableMock = (rows: unknown[], reads: unknown[] = []): MockedResponse => ({
  request: { query: PORTAL_APP_TABLE, variables: () => true },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: () => {
    reads.push(1);
    return {
      data: {
        portalModesTable: { __typename: 'PortalModesTablePage', rows, total: rows.length, page: 1, page_size: 50 },
      },
    };
  },
});

const saved = (sent: unknown[]): MockedResponse => ({
  request: { query: SET_PORTAL_APP_FEATURES, variables: () => true },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: (variables: Record<string, unknown>) => {
    sent.push(variables);
    return {
      data: {
        setPortalAppFeatures: { __typename: 'PortalMode', key: 'finance', chat_enabled: true, apps_enabled: false },
      },
    };
  },
});

const rowOf = (name: string) =>
  screen.getAllByTestId('table-row').find((row) => within(row).queryAllByText(name).length > 0) as HTMLElement;

const chatSwitch = () => screen.getByRole('switch', { name: 'Chat with a coworker — Finance' });
const appsSwitch = () => screen.getByRole('switch', { name: 'App — Finance' });

describe('PortalAppSettingsPage — the switches', () => {
  it('shows a console its two switches and a website why it has none', async () => {
    renderWithProviders(<PortalAppSettingsPage />, { mocks: [tableMock([FINANCE, WEBSITE])] });
    await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(2));

    expect(chatSwitch()).toBeChecked();
    expect(appsSwitch()).not.toBeChecked();
    expect(within(rowOf('Finance')).getByTestId('value-chat_enabled')).toHaveTextContent('On');
    expect(within(rowOf('Finance')).getByTestId('value-apps_enabled')).toHaveTextContent('Off');

    const website = rowOf('Website');
    expect(within(website).queryByRole('switch')).toBeNull();
    expect(within(within(website).getByTestId('cell-chat_enabled')).getAllByText('No console header')).toHaveLength(2);
  });

  it('turns chat off for a console, confirms it and re-reads the table', async () => {
    const sent: unknown[] = [];
    const reads: unknown[] = [];
    renderWithProviders(<PortalAppSettingsPage />, { mocks: [tableMock([FINANCE], reads), saved(sent)] });
    await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(1));
    const readsBefore = reads.length;

    fireEvent.click(chatSwitch());

    expect(await screen.findByText('Chat Off for Finance')).toBeInTheDocument();
    expect(sent).toEqual([{ key: 'finance', chat_enabled: false }]);
    await waitFor(() => expect(reads.length).toBeGreaterThan(readsBefore));
    await waitFor(() => expect(chatSwitch()).not.toBeDisabled());
  });

  it('turns the Apps drawer on for a console and says so', async () => {
    const sent: unknown[] = [];
    renderWithProviders(<PortalAppSettingsPage />, { mocks: [tableMock([FINANCE]), saved(sent)] });
    await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(1));

    fireEvent.click(appsSwitch());

    expect(await screen.findByText('App On for Finance')).toBeInTheDocument();
    expect(sent).toEqual([{ key: 'finance', apps_enabled: true }]);
  });

  it('reports a change the server refused and frees the switch again', async () => {
    renderWithProviders(<PortalAppSettingsPage />, {
      mocks: [
        tableMock([FINANCE]),
        {
          request: { query: SET_PORTAL_APP_FEATURES, variables: { key: 'finance', chat_enabled: false } },
          error: new Error('Portal registry is read-only'),
        },
      ],
    });
    await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(1));

    fireEvent.click(chatSwitch());

    expect(await screen.findByText('Portal registry is read-only')).toBeInTheDocument();
    expect(screen.queryByText('Chat Off for Finance')).toBeNull();
    await waitFor(() => expect(chatSwitch()).not.toBeDisabled());
  });
});
