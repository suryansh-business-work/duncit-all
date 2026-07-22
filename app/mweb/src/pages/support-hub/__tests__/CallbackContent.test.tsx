import '@testing-library/jest-dom/vitest';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import CallbackContent from '../CallbackContent';
import {
  SUPPORT_CALL_TARGET,
  REQUEST_CALLBACK,
  MY_CALLBACK_REQUESTS,
  type SupportPodOption,
} from '../queries';

const selectedPod: SupportPodOption = {
  membershipId: 'm1',
  podDocId: 'pod-1',
  podSlug: 'chess-night',
  title: 'Chess Night',
  startsAt: new Date().toISOString(),
  endsAt: null,
};

const targetAvailableMock = {
  request: { query: SUPPORT_CALL_TARGET },
  result: { data: { bouncerSupportTarget: { phone: '+911234567890', available: true } } },
};

const targetUnavailableMock = {
  request: { query: SUPPORT_CALL_TARGET },
  result: { data: { bouncerSupportTarget: { phone: null, available: false } } },
};

const emptyHistoryMock = {
  request: { query: MY_CALLBACK_REQUESTS },
  result: { data: { myCallbackRequests: [] } },
};

const populatedHistoryMock = {
  request: { query: MY_CALLBACK_REQUESTS },
  result: {
    data: {
      myCallbackRequests: [
        {
          id: 'cb1',
          reason: 'Need help with refund',
          status: 'CONTACTED',
          contacted_at: new Date('2026-01-02T10:00:00Z').toISOString(),
          duration_seconds: 125,
          conclusion: 'Resolved',
          created_at: new Date('2026-01-01T09:00:00Z').toISOString(),
        },
        {
          id: 'cb2',
          reason: '',
          status: 'PENDING',
          contacted_at: null,
          duration_seconds: null,
          conclusion: null,
          created_at: new Date('2026-01-03T09:00:00Z').toISOString(),
        },
      ],
    },
  },
};

function renderContent(mocks: any[], selected: SupportPodOption | null = null) {
  return render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <CallbackContent selected={selected} />
    </MockedProvider>,
  );
}

describe('CallbackContent', () => {
  beforeEach(() => {
    // Provide a mutable window.location.href sink.
    Object.defineProperty(globalThis.window, 'location', {
      value: { href: '' },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders both cards and enables Call Now when a target is available', async () => {
    renderContent([targetAvailableMock, emptyHistoryMock]);

    expect(screen.getByText('Call support now')).toBeInTheDocument();
    expect(screen.getByText('Request a callback')).toBeInTheDocument();

    await waitFor(() =>
      expect(
        screen.getByText('Dial +911234567890. We will answer in seconds.'),
      ).toBeInTheDocument(),
    );

    const callBtn = screen.getByRole('button', { name: /Call Now/i });
    await waitFor(() => expect(callBtn).toBeEnabled());
    fireEvent.click(callBtn);
    expect(globalThis.window.location.href).toBe('tel:+911234567890');
  });

  it('disables Call Now and shows fallback copy when target unavailable', async () => {
    renderContent([targetUnavailableMock, emptyHistoryMock]);

    await waitFor(() =>
      expect(
        screen.getByText(/Support phone is not configured yet/i),
      ).toBeInTheDocument(),
    );

    const callBtn = screen.getByRole('button', { name: /Call Now/i });
    expect(callBtn).toBeDisabled();
    // Clicking a disabled/guarded button must not set href.
    fireEvent.click(callBtn);
    expect(globalThis.window.location.href).toBe('');
  });

  it('requests a callback successfully and shows the success alert', async () => {
    const requestMock = {
      request: {
        query: REQUEST_CALLBACK,
        variables: { input: { pod_id: 'pod-1', reason: 'Billing issue' } },
      },
      result: { data: { requestBouncerCallback: { id: 'r1', status: 'PENDING', created_at: new Date().toISOString() } } },
    };

    renderContent(
      [targetAvailableMock, emptyHistoryMock, requestMock, emptyHistoryMock],
      selectedPod,
    );

    const input = screen.getByLabelText(/What's it about/i);
    fireEvent.change(input, { target: { value: 'Billing issue' } });

    fireEvent.click(screen.getByRole('button', { name: /Request callback/i }));

    await waitFor(() =>
      expect(
        screen.getByText('Callback requested. We will reach you shortly.'),
      ).toBeInTheDocument(),
    );
    // Reason field cleared after success.
    expect((input as HTMLTextAreaElement).value).toBe('');

    // Dismiss success alert.
    fireEvent.click(screen.getByRole('button', { name: /Close/i }));
    await waitFor(() =>
      expect(
        screen.queryByText('Callback requested. We will reach you shortly.'),
      ).not.toBeInTheDocument(),
    );
  });

  it('requests with null pod_id/reason when nothing is selected or entered', async () => {
    const requestMock = {
      request: {
        query: REQUEST_CALLBACK,
        variables: { input: { pod_id: null, reason: null } },
      },
      result: { data: { requestBouncerCallback: { id: 'r2', status: 'PENDING', created_at: new Date().toISOString() } } },
    };

    renderContent([targetAvailableMock, emptyHistoryMock, requestMock, emptyHistoryMock], null);

    fireEvent.click(screen.getByRole('button', { name: /Request callback/i }));

    await waitFor(() =>
      expect(
        screen.getByText('Callback requested. We will reach you shortly.'),
      ).toBeInTheDocument(),
    );
  });

  it('shows an error alert when the mutation fails', async () => {
    const errMock = {
      request: {
        query: REQUEST_CALLBACK,
        variables: { input: { pod_id: null, reason: null } },
      },
      error: new Error('Boom callback failure'),
    };

    renderContent([targetAvailableMock, emptyHistoryMock, errMock], null);

    fireEvent.click(screen.getByRole('button', { name: /Request callback/i }));

    await waitFor(() =>
      expect(screen.getByText('Boom callback failure')).toBeInTheDocument(),
    );

    // Dismiss the error alert.
    fireEvent.click(screen.getByRole('button', { name: /Close/i }));
    await waitFor(() =>
      expect(screen.queryByText('Boom callback failure')).not.toBeInTheDocument(),
    );
  });

  it('renders previous callbacks from history', async () => {
    renderContent([targetAvailableMock, populatedHistoryMock], null);

    expect(await screen.findByText('Previous callbacks')).toBeInTheDocument();
    expect(screen.getByText('Need help with refund')).toBeInTheDocument();
    expect(screen.getByText('CONTACTED')).toBeInTheDocument();
    expect(screen.getByText('PENDING')).toBeInTheDocument();
    // Contacted meta line with duration + conclusion.
    expect(screen.getByText(/2m 5s/)).toBeInTheDocument();
    expect(screen.getByText(/Resolved/)).toBeInTheDocument();
  });
});
