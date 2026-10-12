/**
 * Completing a pod: the settlement, and the two things it is computed from.
 *
 * The payout comes from the SCANNED seats — a booking nobody checked in is not
 * part of it, even though its money was collected and is not refunded. So the
 * preview has to say which seats produced the figure, and the roster it sits
 * over is the evidence for it.
 */
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import PodCompleteDialog from '../src/pod-complete/PodCompleteDialog';
import PodMediaSummary from '../src/pod-complete/PodMediaSummary';
import SettlementPreview from '../src/pod-complete/SettlementPreview';
import { HostPodActionsProvider } from '../src/HostPodActionsProvider';
import { COMPLETE_POD, POD_SETTLEMENT_PREVIEW } from '../src/queries';
import { POD_MEDIA_BOARD } from '../src/pod-media/queries';
import { hostActionsConfig, labelsFor } from './host-actions-config';

const POD = { id: 'pod-1', pod_title: 'Sunday Badminton' };
const VENUE_POD = { ...POD, venue_id: 'venue-1' };
const labels = labelsFor();
const testTheme = createTheme();

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const waterfall = {
  __typename: 'PodFinanceWaterfall',
  version: 1,
  amount: 1000,
  gst_pct: 18,
  gst_amount: 180,
  net_amount: 820,
  platform_fee_pct: 10,
  platform_fee_amount: 82,
  pool_amount: 738,
  club_admin_pct: 0,
  club_admin_amount: 0,
  venue_amount: 300,
  venue_commission_pct: 5,
  venue_commission_amount: 15,
  venue_receives: 285,
  host_amount: 438,
  host_commission_pct: 0,
  host_commission_amount: 0,
  host_receives: 438,
  duncit_revenue: 97,
  host_earn_pct: 43.8,
};

const attendee = (over: Record<string, unknown> = {}) => ({
  __typename: 'PodSettlementAttendee',
  membership_id: 'm-1',
  user_id: 'u-1',
  name: 'Asha Rao',
  seats: 2,
  attended: true,
  attended_at: '2026-08-30T12:40:00.000Z',
  amount: 500,
  ...over,
});

const settlement = (over: Record<string, unknown> = {}) => ({
  __typename: 'PodSettlement',
  currency_symbol: '₹',
  collected_total: 1200,
  // No bill entered: the venue's side is the ₹300 the slot was booked at.
  venue_bill: 0,
  venue_slot_price: 300,
  include_slot_price: false,
  has_venue: true,
  paying_attendees: 8,
  attended_seats: 8,
  booked_seats: 10,
  attended_total: 1000,
  attendees: [attendee()],
  complete_deadline: '2026-08-31T14:00:00.000Z',
  complete_expired: false,
  // The "You receive" line reads this, not waterfall.host_receives — it is what
  // the release will actually carry.
  host_payout_amount: 438,
  waterfall,
  ...over,
});

const previewMock = (
  over: Record<string, unknown> = {},
  amount = 0,
  includeSlotPrice = false,
): MockedResponse => ({
  request: {
    query: POD_SETTLEMENT_PREVIEW,
    variables: { pod_id: 'pod-1', venue_bill_amount: amount, include_slot_price: includeSlotPrice },
  },
  result: { data: { podSettlementPreview: settlement(over) } },
  maxUsageCount: Number.POSITIVE_INFINITY,
});

/** The preview at whatever bill the dialog has reached — the dialog suites assert the write, not the read. */
const anyPreviewMock = (): MockedResponse => ({
  request: { query: POD_SETTLEMENT_PREVIEW, variables: () => true },
  result: { data: { podSettlementPreview: settlement() } },
  maxUsageCount: Number.POSITIVE_INFINITY,
});

const mediaBoardMock = (items: unknown[] = []): MockedResponse => ({
  request: { query: POD_MEDIA_BOARD, variables: { pod_doc_id: 'pod-1' } },
  result: {
    data: {
      podMediaBoard: {
        __typename: 'PodMediaBoard',
        pod_id: 'DUN-POD-4821',
        pod_title: 'Sunday Badminton',
        pod_date_time: '2026-08-30T12:30:00.000Z',
        viewer: 'HOST',
        can_upload: true,
        is_cancelled: false,
        count: items.length,
        items,
      },
    },
  },
  maxUsageCount: Number.POSITIVE_INFINITY,
});

const wrap = (ui: React.ReactNode, mocks: readonly MockedResponse[] = [], config = {}) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[...mocks]}>
      <ThemeProvider theme={testTheme}>
        <HostPodActionsProvider {...hostActionsConfig(config)}>{ui}</HostPodActionsProvider>
      </ThemeProvider>
    </MockedProvider>
  );

afterEach(() => {
  vi.clearAllMocks();
});

describe('SettlementPreview', () => {
  const preview = (mocks: readonly MockedResponse[], props: Record<string, unknown> = {}) =>
    wrap(
      <SettlementPreview
        podId="pod-1"
        venueBillAmount={0}
        includeSlotPrice={false}
        onScan={vi.fn()}
        refreshToken={0}
        {...(props as never)}
      />,
      mocks,
    );

  it('waits on the figures rather than showing a payout it does not have', () => {
    const { container } = preview([previewMock()]);

    expect(container.querySelector('[role="progressbar"]')).not.toBeNull();
  });

  // Not collected_total: folding in seats nobody scanned would make every line
  // below fail to add up.
  it('says which seats the figure came from', async () => {
    preview([previewMock()]);
    await settle();

    expect(screen.getByTestId('settlement-attendees').textContent).toContain(
      'Based on 8 attended seats of 10 booked',
    );
    expect(screen.getByText(/was collected from seats nobody scanned in/)).toBeInTheDocument();
    expect(screen.getByText(/200\.00/)).toBeInTheDocument();
  });

  // The same four-way split as Create Pod and every portal, the host's own
  // earning first: host 438 · venue keeps 285 of its 300 · Duncit & govt =
  // GST 180 + fee 82 + venue commission 15 — adding back to the ₹1,000 basis.
  it('splits the settled money four ways with the host’s earning first', async () => {
    preview([previewMock()]);
    await settle();

    const rows = within(screen.getByTestId('earnings-split'))
      .getAllByRole('button')
      .map((node) => node.getAttribute('aria-label'));
    expect(rows).toEqual([
      'Your Earning (Host)',
      'Venue Take',
      'Club Admin Take',
      'Duncit Commission & Govt Charges',
    ]);
    expect(screen.getByText('₹438.00')).toBeInTheDocument();
    expect(screen.getByText('₹285.00')).toBeInTheDocument();
    expect(screen.getByText('₹277.00')).toBeInTheDocument();
    expect(screen.queryByTestId('earnings-split-reconcile-warning')).not.toBeInTheDocument();
  });

  const billLine = (key: string) => screen.getByTestId(`venue-bill-line-${key}`).textContent;

  // What the venue's side comes to, above the split that takes it off the pool.
  it('states the slot price and that no bill was entered, on a venue pod', async () => {
    preview([previewMock()]);
    await settle();

    expect(billLine('attendees')).toBe(
      `${labels.venueBill.attendees}${labels.venueBill.attendeesValue(8, 10)}`,
    );
    expect(billLine('slot-price')).toBe(`${labels.venueBill.slotPrice}₹300.00`);
    expect(billLine('final-bill')).toBe(`${labels.venueBill.finalBill}${labels.venueBill.noBill}`);
    expect(billLine('venue-total')).toBe(`${labels.venueBill.venueTotal}₹300.00`);
  });

  // The preview is asked at the bill AND the slot-price choice — the mock only
  // answers that exact pair, so a dropped variable shows as a failed preview.
  it('asks for the split with the slot price paid on top of the bill', async () => {
    preview(
      [
        previewMock(
          {
            venue_bill: 450.5,
            include_slot_price: true,
            waterfall: { ...waterfall, venue_amount: 750.5 },
          },
          450.5,
          true,
        ),
      ],
      { venueBillAmount: 450.5, includeSlotPrice: true },
    );
    await settle();

    expect(screen.queryByTestId('settlement-preview-error')).not.toBeInTheDocument();
    expect(billLine('final-bill')).toBe(`${labels.venueBill.finalBill}₹450.50`);
    expect(billLine('venue-total')).toBe(`${labels.venueBill.venueTotalWithSlot}₹750.50`);
  });

  it('has no venue bill to summarise on a pod with no venue behind it', async () => {
    preview([previewMock({ has_venue: false, venue_slot_price: 0 })]);
    await settle();

    expect(screen.getByTestId('settlement-attendees')).toBeInTheDocument();
    expect(screen.queryByTestId('venue-bill-summary')).not.toBeInTheDocument();
  });

  it('words a single attended seat in the singular', async () => {
    preview([previewMock({ attended_seats: 1, booked_seats: 1, attended_total: 1200 })]);
    await settle();

    expect(screen.getByTestId('settlement-attendees').textContent).toContain(
      'Based on 1 attended seat of 1 booked',
    );
  });

  it('says nothing about unscanned money when every booked seat came', async () => {
    preview([previewMock({ attended_seats: 10, booked_seats: 10 })]);
    await settle();

    expect(screen.queryByText(/nobody scanned in/)).not.toBeInTheDocument();
  });

  // The venue is paid in full and the host's share is nil — never taken back.
  it('explains a payout the venue bill swallowed rather than showing a negative', async () => {
    preview([previewMock({ waterfall: { ...waterfall, host_receives: -120 } })]);
    await settle();

    expect(screen.getByTestId('settlement-shortfall')).toBeInTheDocument();
  });

  it('leaves the shortfall note off a pod that paid its host', async () => {
    preview([previewMock()]);
    await settle();

    expect(screen.queryByTestId('settlement-shortfall')).not.toBeInTheDocument();
  });

  // The window to complete has passed, so the host's share is forfeited. The
  // figures still render — the host is owed the arithmetic behind a nil payout.
  it('says the share is forfeited once the window to complete has passed', async () => {
    preview([previewMock({ complete_expired: true })]);
    await settle();

    expect(screen.getByTestId('settlement-expired')).toBeInTheDocument();
  });

  // Silently hiding the calculation would leave the host guessing.
  it('shows the server reason when the preview could not be computed', async () => {
    preview([
      {
        request: {
          query: POD_SETTLEMENT_PREVIEW,
          variables: { pod_id: 'pod-1', venue_bill_amount: 0, include_slot_price: false },
        },
        error: new Error('This pod has no completed payments yet'),
        maxUsageCount: Number.POSITIVE_INFINITY,
      },
    ]);
    await settle();

    expect(screen.getByTestId('settlement-preview-error').textContent).toContain(
      'This pod has no completed payments yet',
    );
  });

  it('asks for a bill when there is nothing to compute from and nothing failed', async () => {
    preview([
      {
        request: {
          query: POD_SETTLEMENT_PREVIEW,
          variables: { pod_id: 'pod-1', venue_bill_amount: 0, include_slot_price: false },
        },
        result: { data: { podSettlementPreview: null } },
        maxUsageCount: Number.POSITIVE_INFINITY,
      },
    ]);
    await settle();

    expect(screen.getByTestId('settlement-preview-error').textContent).toContain(
      'mweb.hostShare.previewHint',
    );
  });

  // A scanner session may have checked somebody in, and the settlement is
  // computed from exactly that.
  it('re-reads the figures after a scanner session', async () => {
    const { rerender } = preview([previewMock()]);
    await settle();

    rerender(
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[previewMock({ attended_seats: 9 })]}>
        <ThemeProvider theme={testTheme}>
          <HostPodActionsProvider {...hostActionsConfig()}>
            <SettlementPreview
              podId="pod-1"
              venueBillAmount={0}
              includeSlotPrice={false}
              onScan={vi.fn()}
              refreshToken={1}
            />
          </HostPodActionsProvider>
        </ThemeProvider>
      </MockedProvider>,
    );
    await settle();

    expect(screen.getByTestId('settlement-attendees')).toBeInTheDocument();
  });

  // Attendance is proof of arrival, so it is only ever created by scanning that
  // person's ticket — the row that has not been scanned carries the action.
  it('offers the scanner on the rows nobody has scanned yet', async () => {
    const onScan = vi.fn();
    preview(
      [
        previewMock({
          attendees: [attendee(), attendee({ membership_id: 'm-2', name: 'Vikram S', attended: false, attended_at: null })],
        }),
      ],
      { onScan },
    );
    await settle();
    expect(screen.getByText('Vikram S')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button')[0]);

    expect(onScan).toHaveBeenCalled();
  });
});

describe('PodMediaSummary', () => {
  it('shows what the pod already has rather than asking for it a second time', async () => {
    wrap(<PodMediaSummary podId="pod-1" />, [
      mediaBoardMock([
        {
          __typename: 'PodMediaItem',
          url: 'https://ik.imagekit.io/duncit/pod-media/a.jpg',
          type: 'IMAGE',
          source: 'HOST',
          uploaded_by_id: 'u-1',
          uploaded_by_name: 'Asha Rao',
          uploaded_at: '2026-08-30T14:00:00.000Z',
          mine: true,
          can_remove: true,
        },
      ]),
    ]);
    await settle();

    expect(screen.getByText(labels.podMedia)).toBeInTheDocument();
    expect(screen.getByText('Asha Rao')).toBeInTheDocument();
    // The Complete dialog shows the strip, it does not edit it.
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
  });

  it('offers the way to add more only where the surface owns that page', async () => {
    const onOpenPodMedia = vi.fn();
    const podMediaLabels = hostActionsConfig().podMediaLabels;
    wrap(<PodMediaSummary podId="pod-1" />, [mediaBoardMock()], { onOpenPodMedia });
    await settle();

    fireEvent.click(screen.getByRole('button', { name: podMediaLabels.pageTitle }));
    expect(onOpenPodMedia).toHaveBeenCalledWith('pod-1');

    cleanup();
    wrap(<PodMediaSummary podId="pod-1" />, [mediaBoardMock()], { onOpenPodMedia: undefined });
    await settle();
    expect(screen.queryByRole('button', { name: podMediaLabels.pageTitle })).not.toBeInTheDocument();
  });
});

describe('PodCompleteDialog settlement', () => {
  const dialog = (
    pod: Record<string, unknown> | null,
    mocks: readonly MockedResponse[],
    over: Record<string, unknown> = {},
  ) => {
    const notifySuccess = vi.fn();
    const props = { pod, onClose: vi.fn(), onCompleted: vi.fn(), ...over };
    const view = wrap(<PodCompleteDialog {...(props as never)} />, mocks, { notifySuccess });
    return { props, notifySuccess, ...view };
  };

  /** Answers the completion and keeps the input it was sent. */
  const completeMock = () => {
    const sent: unknown[] = [];
    const mock: MockedResponse = {
      request: {
        query: COMPLETE_POD,
        variables: (variables: Record<string, unknown>) => {
          sent.push(variables.input);
          return true;
        },
      },
      result: { data: { completePod: { __typename: 'Pod', id: 'pod-1' } } },
      maxUsageCount: Number.POSITIVE_INFINITY,
    };
    return { mock, sent };
  };

  const BILL = 'https://cdn.duncit.com/pod-completion/bill.pdf';
  const billInput = () =>
    within(screen.getByTestId('pod-complete-venue-bill')).getByRole('spinbutton');
  const enterBill = async (amount: string) => {
    fireEvent.change(billInput(), { target: { value: amount } });
    await settle();
  };
  const submitForm = async () => {
    fireEvent.submit(document.querySelector('#pod-complete-form') as HTMLFormElement);
    await settle();
    await settle();
  };

  // The bill is optional: left empty, the venue is paid the slot price it was
  // booked at, and the completion goes to Finance like any other.
  it('completes a venue pod with no bill entered, and says the payouts are with Finance', async () => {
    const { mock, sent } = completeMock();
    const { props, notifySuccess } = dialog(VENUE_POD, [previewMock(), mediaBoardMock(), mock]);
    await settle();

    expect(screen.getByText(labels.venueBill.amountHint)).toBeInTheDocument();
    await submitForm();

    expect(sent).toEqual([{ pod_id: 'pod-1', venue_bill_amount: 0 }]);
    expect(notifySuccess).toHaveBeenCalledWith(labels.venueBill.sentToFinance);
    expect(notifySuccess).toHaveBeenCalledTimes(1);
    expect(props.onCompleted).toHaveBeenCalledTimes(1);
  });

  // The file and the slot-price choice mean nothing without an amount, so
  // neither is on screen until there is one.
  it('asks for the bill itself and the slot-price choice only once an amount is entered', async () => {
    dialog(VENUE_POD, [anyPreviewMock(), mediaBoardMock()]);
    await settle();
    expect(screen.queryByLabelText('media')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pod-complete-include-slot')).not.toBeInTheDocument();

    await enterBill('450');
    expect(screen.getByLabelText('media')).toBeInTheDocument();
    const includeSlot = screen.getByRole('checkbox', { name: labels.venueBill.includeSlot });
    expect(includeSlot).not.toBeChecked();
    expect(includeSlot).toHaveAccessibleDescription(labels.venueBill.includeSlotHint);

    await enterBill('');
    expect(screen.queryByLabelText('media')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pod-complete-include-slot')).not.toBeInTheDocument();
  });

  // Finance approves the payout against the document.
  it('will not complete with a bill amount and no bill uploaded', async () => {
    const { mock, sent } = completeMock();
    const { props, notifySuccess } = dialog(VENUE_POD, [anyPreviewMock(), mediaBoardMock(), mock]);
    await settle();

    await enterBill('450');
    await submitForm();

    expect(await screen.findByRole('alert')).toHaveTextContent(labels.venueBill.uploadRequired);
    expect(sent).toEqual([]);
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(props.onCompleted).not.toHaveBeenCalled();
  });

  it('will not complete with a bill below zero', async () => {
    const { mock, sent } = completeMock();
    const { props } = dialog(VENUE_POD, [anyPreviewMock(), mediaBoardMock(), mock]);
    await settle();

    await enterBill('-5');
    await submitForm();

    expect(await screen.findByText(labels.venueBill.amountInvalid)).toBeInTheDocument();
    // The reason takes the hint's place under the field.
    expect(screen.queryByText(labels.venueBill.amountHint)).not.toBeInTheDocument();
    expect(sent).toEqual([]);
    expect(props.onCompleted).not.toHaveBeenCalled();
  });

  it('sends the bill, its file and a bill that replaces the slot price', async () => {
    const { mock, sent } = completeMock();
    const { props } = dialog(VENUE_POD, [anyPreviewMock(), mediaBoardMock(), mock]);
    await settle();

    await enterBill('450.50');
    fireEvent.change(screen.getByLabelText('media'), { target: { value: BILL } });
    await submitForm();

    expect(sent).toEqual([
      { pod_id: 'pod-1', venue_bill_amount: 450.5, venue_bill_url: BILL, include_slot_price: false },
    ]);
    expect(props.onCompleted).toHaveBeenCalledTimes(1);
  });

  it('sends the choice to pay the slot price on top of the bill', async () => {
    const { mock, sent } = completeMock();
    const { props, notifySuccess } = dialog(VENUE_POD, [anyPreviewMock(), mediaBoardMock(), mock]);
    await settle();

    await enterBill('450');
    fireEvent.change(screen.getByLabelText('media'), { target: { value: BILL } });
    fireEvent.click(screen.getByRole('checkbox', { name: labels.venueBill.includeSlot }));
    await settle();
    expect(screen.getByRole('checkbox', { name: labels.venueBill.includeSlot })).toBeChecked();
    await submitForm();

    expect(sent).toEqual([
      { pod_id: 'pod-1', venue_bill_amount: 450, venue_bill_url: BILL, include_slot_price: true },
    ]);
    expect(notifySuccess).toHaveBeenCalledWith(labels.venueBill.sentToFinance);
    expect(props.onCompleted).toHaveBeenCalledTimes(1);
  });

  it('completes a pod with no venue behind it, with no bill to ask for', async () => {
    const { mock, sent } = completeMock();
    const { props, notifySuccess } = dialog(POD, [previewMock(), mediaBoardMock(), mock]);
    await settle();

    expect(screen.queryByTestId('pod-complete-venue-bill-fields')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: labels.completePod }));
    await settle();
    await settle();

    expect(sent).toEqual([{ pod_id: 'pod-1', venue_bill_amount: 0 }]);
    expect(notifySuccess).toHaveBeenCalledWith(labels.venueBill.sentToFinance);
    expect(props.onCompleted).toHaveBeenCalledTimes(1);
  });

  it('states the server reason rather than reporting a completion it never got', async () => {
    const { props, notifySuccess } = dialog(POD, [
      previewMock(),
      mediaBoardMock(),
      {
        request: { query: COMPLETE_POD, variables: () => true },
        error: new Error('This pod has already been completed'),
        maxUsageCount: Number.POSITIVE_INFINITY,
      },
    ]);
    await settle();

    fireEvent.click(screen.getByRole('button', { name: labels.completePod }));
    await settle();
    await settle();

    expect(screen.getByText('This pod has already been completed')).toBeInTheDocument();
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(props.onCompleted).not.toHaveBeenCalled();
  });

  it('closes without completing anything', async () => {
    const { props } = dialog(POD, [previewMock(), mediaBoardMock()]);
    await settle();

    fireEvent.click(screen.getByRole('button', { name: labels.cancel }));

    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(props.onCompleted).not.toHaveBeenCalled();
  });
});
