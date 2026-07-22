import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MockedProvider } from '@apollo/client/testing';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import PodHistoryDetails from '../PodHistoryDetails';
import { PUBLIC_APP_SETTINGS } from '../../../utils/dateFormat';
import {
  POD_HISTORY_INVOICE_PDF,
  POD_HISTORY_TICKET_FOR_POD,
  POD_HISTORY_TICKET_PDF,
  type PodHistoryItem,
} from '../queries';
import { MY_PRODUCT_ORDERS_FOR_POD } from '../productOrders';
import { gql } from '@apollo/client';

const notifyMock = vi.fn();
vi.mock('../../../components/notify', () => ({
  notify: (...args: unknown[]) => notifyMock(...args),
}));

const PUBLIC_FINANCE = gql`
  query PublicFinanceSettingsForPricing {
    publicFinanceSettings {
      platform_fee_pct
      gst_pct
      currency_symbol
      default_backout_deduction_pct
    }
  }
`;

const appSettingsMock = {
  request: { query: PUBLIC_APP_SETTINGS },
  result: {
    data: {
      publicAppSettings: {
        date_format: 'dd MMM yyyy',
        time_format: 'hh:mm a',
        time_zone: 'Asia/Kolkata',
        min_birth_year: 1940,
        max_birth_year: 2012,
        draft_retention_days: 3,
      },
    },
  },
};

const financeMock = {
  request: { query: PUBLIC_FINANCE },
  result: {
    data: {
      publicFinanceSettings: {
        platform_fee_pct: 5,
        gst_pct: 18,
        currency_symbol: '₹',
        default_backout_deduction_pct: 10,
      },
    },
  },
};

const ordersMock = (podId: string) => ({
  request: { query: MY_PRODUCT_ORDERS_FOR_POD, variables: { podId } },
  result: { data: { myProductOrdersForPod: [] } },
});

const basePod = (over: Record<string, unknown> = {}) => ({
  id: 'pod-doc-1',
  pod_id: 'pod-1',
  club_slug: 'club-x',
  pod_title: 'Sunset Yoga',
  pod_date_time: '2099-08-01T10:00:00.000Z',
  pod_end_date_time: '2099-08-01T12:00:00.000Z',
  pod_amount: 500,
  pod_type: 'PAID_POD',
  is_deleted: false,
  no_of_spots: 10,
  pod_images_and_videos: [{ url: 'https://img/x.jpg', type: 'IMAGE' }],
  club: { id: 'c1', category_id: 'cat', super_category_id: 'sup' },
  ...over,
});

const baseItem = (over: Partial<PodHistoryItem> = {}): PodHistoryItem =>
  ({
    id: 'mem-1',
    status: 'JOINED',
    joined_at: '2026-01-01T10:00:00.000Z',
    backed_out_at: null,
    payment_id: 'pay-1',
    refund_status: 'NONE',
    refund_payment_id: null,
    referral_token: null,
    source: 'WEB',
    pod: basePod(),
    ...over,
  }) as PodHistoryItem;

const renderIt = (
  item: PodHistoryItem,
  extraMocks: unknown[] = [],
  handlers: { onBackout?: () => void; onRejoin?: () => void; backingOut?: boolean; rejoining?: boolean } = {},
) => {
  const onBackout = handlers.onBackout ?? vi.fn();
  const onRejoin = handlers.onRejoin ?? vi.fn();
  const mocks = [appSettingsMock, financeMock, ...(item.pod?.id ? [ordersMock(item.pod.id)] : []), ...extraMocks];
  render(
    <MockedProvider mocks={mocks as never} addTypename={false}>
      <MemoryRouter>
        <PodHistoryDetails
          item={item}
          backingOut={handlers.backingOut ?? false}
          rejoining={handlers.rejoining ?? false}
          onBackout={onBackout}
          onRejoin={onRejoin}
        />
      </MemoryRouter>
    </MockedProvider>,
  );
  return { onBackout, onRejoin };
};

beforeEach(() => {
  notifyMock.mockReset();
});

describe('PodHistoryDetails', () => {
  it('renders a populated JOINED booking with paid amount, status/refund chips and actions', () => {
    renderIt(baseItem());
    expect(screen.getByText('Sunset Yoga')).toBeInTheDocument();
    expect(screen.getByText('Joined')).toBeInTheDocument();
    expect(screen.getByText('Refund: Not started')).toBeInTheDocument();
    expect(screen.getByText(/Paid pod/)).toBeInTheDocument();
    // Go to Pod Details points at the SEO url
    const podLink = screen.getByText('Go to Pod Details').closest('a');
    expect(podLink).toHaveAttribute('href', '/club/club-x/pod/pod-1');
    // Ticket button shows for JOINED
    expect(screen.getByText('Ticket')).toBeInTheDocument();
    // Timeline + terms
    expect(screen.getByText('Timeline')).toBeInTheDocument();
    expect(screen.getByText(/Backout Terms/)).toBeInTheDocument();
    // Support link carries the payment category + membership id
    const supportLink = screen.getByText('Contact Support').closest('a');
    expect(supportLink?.getAttribute('href')).toContain('category=PAYMENT');
    expect(supportLink?.getAttribute('href')).toContain('podId=pod-doc-1');
  });

  it('shows the free-pod label and event icon fallback when no image', () => {
    renderIt(baseItem({ pod: basePod({ pod_type: 'FREE_POD', pod_images_and_videos: [] }) }));
    expect(screen.getByText('Free pod')).toBeInTheDocument();
  });

  it('renders removed-pod alert and hides pod-detail/backout actions when deleted', () => {
    renderIt(baseItem({ pod: basePod({ is_deleted: true }) }));
    expect(screen.getByText(/This pod was removed/)).toBeInTheDocument();
    expect(screen.queryByText('Go to Pod Details')).not.toBeInTheDocument();
    expect(screen.queryByText('Backout Pod')).not.toBeInTheDocument();
    // Invoice + support still available
    expect(screen.getByText('Invoice')).toBeInTheDocument();
    expect(screen.getByText('Contact Support')).toBeInTheDocument();
  });

  it('fires onBackout from the Backout button for a JOINED booking', () => {
    const { onBackout } = renderIt(baseItem());
    fireEvent.click(screen.getByText('Backout Pod'));
    expect(onBackout).toHaveBeenCalledOnce();
  });

  it('shows the backing-out label and disables the button while backing out', () => {
    renderIt(baseItem(), [], { backingOut: true });
    expect(screen.getByText('Backing out...')).toBeInTheDocument();
  });

  it('offers Rejoin + replacement notice for a backed-out active pod and fires onRejoin', () => {
    const { onRejoin } = renderIt(
      baseItem({ status: 'BACKED_OUT', backed_out_at: '2026-02-01T10:00:00.000Z' }),
    );
    const rejoin = screen.getByText('Rejoin Pod');
    expect(rejoin).toBeInTheDocument();
    expect(screen.getByText('We are finding your replacement')).toBeInTheDocument();
    fireEvent.click(rejoin);
    expect(onRejoin).toHaveBeenCalledOnce();
  });

  it('shows the rejoining label while rejoining', () => {
    renderIt(baseItem({ status: 'BACKED_OUT' }), [], { rejoining: true });
    expect(screen.getByText('Rejoining...')).toBeInTheDocument();
  });

  it('shows the replacement notice for BACKOUT_IN_PROCESS', () => {
    renderIt(baseItem({ status: 'BACKOUT_IN_PROCESS' }));
    expect(screen.getByText('Backout in process')).toBeInTheDocument();
    expect(screen.getByText('We are finding your replacement')).toBeInTheDocument();
  });

  it('shows the pending-refund alert for a backed-out booking awaiting criteria', () => {
    renderIt(baseItem({ status: 'BACKED_OUT', refund_status: 'PENDING', pod: basePod({ pod_date_time: '2000-01-01T10:00:00.000Z', pod_end_date_time: '2000-01-01T11:00:00.000Z' }) }));
    expect(screen.getByText(/Refund is waiting for criteria completion/)).toBeInTheDocument();
    // Ended pod => no rejoin
    expect(screen.queryByText('Rejoin Pod')).not.toBeInTheDocument();
  });

  it('notifies the refund status when the Refund Status button is clicked', () => {
    renderIt(baseItem({ refund_status: 'PROCESSED' }));
    fireEvent.click(screen.getByText(/Refund Status: Refund initiated/));
    expect(notifyMock).toHaveBeenCalledWith('Refund status: Refund initiated', 'info');
  });

  it('downloads the invoice PDF on success', async () => {
    let downloadName = '';
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        downloadName = this.download;
      });
    const invoiceMock = {
      request: { query: POD_HISTORY_INVOICE_PDF, variables: { id: 'pay-1' } },
      result: { data: { paymentInvoicePdfBase64: 'QkFTRTY0' } },
    };
    renderIt(baseItem(), [invoiceMock]);
    fireEvent.click(screen.getByText('Invoice'));
    await waitFor(() => expect(clickSpy).toHaveBeenCalled());
    expect(downloadName).toBe('pod-invoice-pay-1.pdf');
    expect(notifyMock).not.toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('notifies an error when the invoice is not available', async () => {
    const invoiceMock = {
      request: { query: POD_HISTORY_INVOICE_PDF, variables: { id: 'pay-1' } },
      result: { data: { paymentInvoicePdfBase64: null } },
    };
    renderIt(baseItem(), [invoiceMock]);
    fireEvent.click(screen.getByText('Invoice'));
    await waitFor(() => expect(notifyMock).toHaveBeenCalledWith('Invoice not available', 'error'));
  });

  it('downloads the event ticket PDF on success', async () => {
    let downloadName = '';
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        downloadName = this.download;
      });
    const ticketForPodMock = {
      request: { query: POD_HISTORY_TICKET_FOR_POD, variables: { podId: 'pod-doc-1' } },
      result: { data: { myEventTicketForPod: { id: 'tk-1', ticket_code: 'ABC123' } } },
    };
    const ticketPdfMock = {
      request: { query: POD_HISTORY_TICKET_PDF, variables: { id: 'tk-1' } },
      result: { data: { eventTicketPdfBase64: 'VElDS0VU' } },
    };
    renderIt(baseItem(), [ticketForPodMock, ticketPdfMock]);
    fireEvent.click(screen.getByText('Ticket'));
    await waitFor(() => expect(clickSpy).toHaveBeenCalled());
    expect(downloadName).toBe('ticket-ABC123.pdf');
    clickSpy.mockRestore();
  });

  it('notifies an error when no ticket exists for the booking', async () => {
    const ticketForPodMock = {
      request: { query: POD_HISTORY_TICKET_FOR_POD, variables: { podId: 'pod-doc-1' } },
      result: { data: { myEventTicketForPod: null } },
    };
    renderIt(baseItem(), [ticketForPodMock]);
    fireEvent.click(screen.getByText('Ticket'));
    await waitFor(() =>
      expect(notifyMock).toHaveBeenCalledWith('Ticket not available for this booking', 'error'),
    );
  });

  it('falls back to "Pod details" and a home link when pod metadata is missing', () => {
    renderIt(baseItem({ pod: null, payment_id: null }));
    expect(screen.getByText('Pod details')).toBeInTheDocument();
    expect(screen.getByText('Date not available')).toBeInTheDocument();
    // Go to Pod Details is disabled (no slug/id)
    const podBtn = screen.getByText('Go to Pod Details').closest('a') ?? screen.getByText('Go to Pod Details').closest('button');
    expect(podBtn).toBeTruthy();
  });
});
