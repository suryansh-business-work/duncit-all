import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { formatDateTime } from '@duncit/app-settings';
import { notifyError } from '@duncit/dialogs';
import { renderWithProviders } from '../../../__tests__/testkit';
import LocationSubscriptionsPage from '../LocationSubscriptionsPage';
import {
  LOCATION_SUBSCRIPTIONS_TABLE,
  LOCATION_SUBSCRIPTION_CITIES,
  SEND_LOCATION_LAUNCH_MESSAGE,
} from '../queries';

vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifyError: vi.fn(),
}));

vi.mock('@duncit/table', async (importOriginal) => {
  const stub = await import('./table-mock');
  return {
    ...(await importOriginal<typeof import('@duncit/table')>()),
    DuncitTable: stub.DuncitTable,
    useApolloTableFetch: stub.useApolloTableFetch,
  };
});

const cityEntry = (id: string, city: string, locationName: string, pending: number) => ({
  __typename: 'LocationSubscriptionCity',
  subscriber_count: pending + 1,
  notified_count: 1,
  pending_count: pending,
  location: {
    __typename: 'Location',
    id,
    city,
    location_name: locationName,
    location_image: '',
    is_launched: true,
  },
});

const citiesMock = (entries: unknown[]): MockedResponse => ({
  request: { query: LOCATION_SUBSCRIPTION_CITIES },
  result: { data: { locationSubscriptionCities: entries } },
});

const subscriber = (id: string, name: string, notifiedAt: string | null) => ({
  __typename: 'LocationSubscription',
  id,
  location_doc_id: 'loc-pune',
  city: 'Pune',
  user_id: `u-${id}`,
  name,
  whatsapp: '+91 90000 00000',
  location_shared: false,
  status: notifiedAt ? 'SENT' : 'PENDING',
  reason: '',
  notified_at: notifiedAt,
  created_at: '2026-09-01T10:00:00.000Z',
});

const subscribersMock: MockedResponse = {
  request: { query: LOCATION_SUBSCRIPTIONS_TABLE, variables: () => true },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: {
    data: {
      locationSubscriptionsTable: {
        __typename: 'LocationSubscriptionsPage',
        total: 2,
        rows: [
          subscriber('s1', 'Asha Rao', null),
          subscriber('s2', 'Kabir Shah', '2026-09-10T08:00:00.000Z'),
        ],
      },
    },
  },
};

const sendMock: MockedResponse = {
  request: { query: SEND_LOCATION_LAUNCH_MESSAGE, variables: { location_doc_id: 'loc-pune' } },
  result: { data: { sendLocationLaunchMessage: { __typename: 'LocationLaunchSendResult', queued: 2 } } },
};

describe('LocationSubscriptionsPage', () => {
  it('names a city by its location when it has no city of its own, and dates each subscriber', async () => {
    renderWithProviders(<LocationSubscriptionsPage />, {
      mocks: [citiesMock([cityEntry('loc-pune', '', 'Pune', 2)]), subscribersMock],
    });

    await waitFor(() => expect(screen.getAllByTestId('value-city')[0]).toHaveTextContent('Pune'));
    // Subscribers come back in server order: Asha (still waiting), then Kabir (messaged).
    await waitFor(() => expect(screen.getAllByTestId('value-notified_at')).toHaveLength(2));
    const [waiting, messaged] = screen.getAllByTestId('value-notified_at');
    expect(waiting).toHaveTextContent('—');
    expect(messaged).toHaveTextContent(formatDateTime('2026-09-10T08:00:00.000Z'));
  });

  it('re-reads the counts after a send, and reports it when that re-read fails', async () => {
    renderWithProviders(<LocationSubscriptionsPage />, {
      mocks: [
        citiesMock([cityEntry('loc-pune', 'Pune', 'Pune', 2)]),
        subscribersMock,
        sendMock,
        { request: { query: LOCATION_SUBSCRIPTION_CITIES }, error: new Error('Counts are unavailable') },
      ],
    });

    fireEvent.click(await screen.findByTestId('location-subscriptions-send'));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Send launch message' }));

    expect(await screen.findByText('Launch message queued for 2 people in Pune.')).toBeInTheDocument();
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Counts are unavailable'));
  });
});
