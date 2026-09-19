import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../../../__tests__/testkit';
import LaunchCitiesTable from '../LaunchCitiesTable';
import { SEND_LOCATION_LAUNCH_MESSAGE, type LaunchCityRow } from '../queries';
import { tableSearch } from './table-mock';

vi.mock('@duncit/table', async (importOriginal) => {
  const stub = await import('./table-mock');
  return { ...(await importOriginal<typeof import('@duncit/table')>()), DuncitTable: stub.DuncitTable };
});

const city = (over: Partial<LaunchCityRow>): LaunchCityRow => ({
  id: 'loc-pune',
  city: 'Pune',
  location_image: '',
  is_launched: true,
  subscriber_count: 5,
  notified_count: 2,
  pending_count: 3,
  ...over,
});

const PUNE = city({});
const GOA = city({ id: 'loc-goa', city: 'Goa', is_launched: false, subscriber_count: 9, notified_count: 0, pending_count: 9 });
const NAGPUR = city({
  id: 'loc-nagpur',
  city: 'Nagpur',
  location_image: 'https://cdn.duncit.com/cities/nagpur.jpg',
  subscriber_count: 1,
  notified_count: 1,
  pending_count: 0,
});

const sendMock = (queued: number, onSend = vi.fn()): MockedResponse => ({
  request: { query: SEND_LOCATION_LAUNCH_MESSAGE, variables: { location_doc_id: 'loc-pune' } },
  result: () => {
    onSend();
    return { data: { sendLocationLaunchMessage: { __typename: 'LocationLaunchSendResult', queued } } };
  },
});

/** The stub grid prints the city twice per row (sort value + rendered cell), so match on either. */
const rowOf = (name: string) =>
  screen.getAllByTestId('table-row').find((row) => within(row).queryAllByText(name).length > 0) as HTMLElement;

const rowsShown = async (count: number) => {
  await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(count));
};

afterEach(() => {
  tableSearch.value = '';
});

describe('LaunchCitiesTable — rows', () => {
  it('only lets a launched city with people still waiting be messaged, and says why otherwise', async () => {
    renderWithProviders(
      <LaunchCitiesTable rows={[PUNE, GOA, NAGPUR]} onSent={vi.fn()} selectedId={null} onSelect={vi.fn()} />
    );

    await rowsShown(3);
    expect(within(rowOf('Pune')).getByTestId('location-subscriptions-send')).toBeEnabled();
    expect(within(rowOf('Goa')).getByTestId('location-subscriptions-send')).toBeDisabled();
    expect(
      within(rowOf('Goa')).getByLabelText('Switch Launched on for this city in Catalog > Locations first.'),
    ).toBeInTheDocument();
    expect(within(rowOf('Nagpur')).getByTestId('location-subscriptions-send')).toBeDisabled();
    expect(
      within(rowOf('Nagpur')).getByLabelText('Everyone on this city’s list has already been messaged.'),
    ).toBeInTheDocument();
  });

  it('shows a city’s picture, or its initial when it has none', async () => {
    renderWithProviders(
      <LaunchCitiesTable rows={[PUNE, NAGPUR]} onSent={vi.fn()} selectedId={null} onSelect={vi.fn()} />
    );

    await rowsShown(2);
    expect(rowOf('Nagpur').querySelector('img')).toHaveAttribute('src', 'https://cdn.duncit.com/cities/nagpur.jpg');
    expect(rowOf('Pune').querySelector('img')).toBeNull();
    expect(within(rowOf('Pune')).getByText('P')).toBeInTheDocument();
  });

  it('narrows the list to the cities matching the search', async () => {
    tableSearch.value = 'go';
    renderWithProviders(
      <LaunchCitiesTable rows={[PUNE, GOA, NAGPUR]} onSent={vi.fn()} selectedId={null} onSelect={vi.fn()} />
    );

    await rowsShown(1);
    expect(rowOf('Goa')).toBeDefined();
  });
});

describe('LaunchCitiesTable — sending', () => {
  it('confirms with the waiting count, queues the send and tells the page', async () => {
    const onSend = vi.fn();
    const onSent = vi.fn();
    renderWithProviders(<LaunchCitiesTable rows={[PUNE]} onSent={onSent} selectedId={null} onSelect={vi.fn()} />, {
      mocks: [sendMock(3, onSend)],
    });

    fireEvent.click(await screen.findByTestId('location-subscriptions-send'));
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText('Send the WhatsApp launch message to 3 people waiting for Pune? This cannot be undone.'),
    ).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send launch message' }));

    expect(await screen.findByText('Launch message queued for 3 people in Pune.')).toBeInTheDocument();
    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSent).toHaveBeenCalledTimes(1);
  });

  it('sends nothing when the confirmation is cancelled', async () => {
    const onSend = vi.fn();
    const onSent = vi.fn();
    renderWithProviders(<LaunchCitiesTable rows={[PUNE]} onSent={onSent} selectedId={null} onSelect={vi.fn()} />, {
      mocks: [sendMock(3, onSend)],
    });

    fireEvent.click(await screen.findByTestId('location-subscriptions-send'));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(onSend).not.toHaveBeenCalled();
    expect(onSent).not.toHaveBeenCalled();
  });

  it('shows why a send failed', async () => {
    const onSent = vi.fn();
    renderWithProviders(<LaunchCitiesTable rows={[PUNE]} onSent={onSent} selectedId={null} onSelect={vi.fn()} />, {
      mocks: [
        {
          request: { query: SEND_LOCATION_LAUNCH_MESSAGE, variables: { location_doc_id: 'loc-pune' } },
          error: new Error('WhatsApp campaign "City launched" is not set up'),
        },
      ],
    });

    fireEvent.click(await screen.findByTestId('location-subscriptions-send'));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Send launch message' }));

    expect(await screen.findByText('WhatsApp campaign "City launched" is not set up')).toBeInTheDocument();
    expect(onSent).not.toHaveBeenCalled();
  });
});
