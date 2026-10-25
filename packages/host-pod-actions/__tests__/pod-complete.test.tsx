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
  is_free: false,
  currency_symbol: '₹',
  collected_total: 1200,
  // No bill entered: the venue's side is the ₹300 the slot was booked at.
  venue_bill: 0,
  venue_slot_price: 300,
  include_slot_price: false,
  // A booking made before offers: no extra charges, no minimum, no agreed terms.
  venue_extra_amount: 0,
  venue_min_guests: 0,
  venue_pax: 0,
  venue_agreed_model: null,
  venue_agreed_rate: null,
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

/** A FREE pod's settlement as the server answers it: nothing collected, no
 * venue side, every figure 0 — the client must show none of them. */
const zeroWaterfall = Object.fromEntries(
  Object.entries(waterfall).map(([key, value]) => [key, typeof value === 'number' ? 0 : value]),
);
const FREE_SETTLEMENT = {
  is_free: true,
  collected_total: 0,
  venue_slot_price: 0,
  has_venue: false,
  paying_attendees: 0,
  attended_total: 0,
  host_payout_amount: 0,
  attendees: [attendee({ amount: 0 })],
  waterfall: { ...zeroWaterfall, version: 1 },
};

/** The preview at exactly this bill and these extra charges — never with a slot-price choice. */
const previewMock = (
  over: Record<string, unknown> = {},
  amount = 0,
  extra = 0,
): MockedResponse => ({
  request: {
    query: POD_SETTLEMENT_PREVIEW,
    variables: { pod_id: 'pod-1', venue_bill_amount: amount, venue_extra_amount: extra },
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
        venueExtraAmount={0}
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
    // A booking from before offers: no extra charges, no minimum, no agreed terms to state.
    expect(screen.queryByTestId('venue-bill-line-extra')).not.toBeInTheDocument();
    expect(screen.queryByTestId('venue-bill-line-paid-guests')).not.toBeInTheDocument();
    expect(screen.queryByTestId('settlement-agreed-terms')).not.toBeInTheDocument();
  });

  // The preview is asked at the bill AND the extra charges — the mock only
  // answers that exact pair, so a dropped variable (or a slot-price choice
  // slipping back in) shows as a failed preview.
  it('prices the agreed amount plus the extra charges, with the bill as its proof', async () => {
    preview(
      [
        previewMock(
          {
            venue_bill: 450.5,
            venue_extra_amount: 120,
            // The server pays the agreed ₹300 plus the ₹120 extra; the bill is evidence.
            waterfall: { ...waterfall, venue_amount: 420 },
          },
          450.5,
          120,
        ),
      ],
      { venueBillAmount: 450.5, venueExtraAmount: 120 },
    );
    await settle();

    expect(screen.queryByTestId('settlement-preview-error')).not.toBeInTheDocument();
    expect(billLine('slot-price')).toBe(`${labels.venueBill.slotPrice}₹300.00`);
    expect(billLine('final-bill')).toBe(`${labels.venueBill.finalBill}₹450.50`);
    expect(billLine('extra')).toBe(`${labels.venueBill.extraCharges}₹120.00`);
    expect(billLine('venue-total')).toBe(`${labels.venueBill.venueTotal}₹420.00`);
  });

  // A per-guest booking is paid for the people who came, never fewer than its
  // minimum — the count is the server's (venue_pax), not worked out here.
  it('states the agreed per-guest terms and the guests the venue is paid for', async () => {
    preview([
      previewMock({
        venue_agreed_model: 'PER_GUEST',
        venue_agreed_rate: 300,
        venue_min_guests: 8,
        venue_pax: 9,
      }),
    ]);
    await settle();

    expect(screen.getByTestId('settlement-agreed-terms').textContent).toBe(
      `${labels.agreedTerms.title}${labels.agreedTerms.value('PER_GUEST', '₹300.00')}`,
    );
    expect(billLine('paid-guests')).toBe(`${labels.venueBill.paidGuests}${labels.venueBill.paidGuestsValue(9, 8)}`);
  });

  it('states no agreed terms when the settlement carries a model but no rate', async () => {
    preview([previewMock({ venue_agreed_model: 'FLAT', venue_agreed_rate: null })]);
    await settle();

    expect(screen.getByTestId('venue-bill-summary')).toBeInTheDocument();
    expect(screen.queryByTestId('settlement-agreed-terms')).not.toBeInTheDocument();
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
          variables: { pod_id: 'pod-1', venue_bill_amount: 0, venue_extra_amount: 0 },
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
          variables: { pod_id: 'pod-1', venue_bill_amount: 0, venue_extra_amount: 0 },
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
              venueExtraAmount={0}
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

  // A free pod moves no money: the roster still shows (attendance gates the
  // completion) but no row, line or split carries a figure.
  it('heads a free pod "Free pod" and shows the roster with no money in it', async () => {
    const { container } = preview([previewMock(FREE_SETTLEMENT)]);
    await settle();

    expect(screen.getByTestId('settlement-free')).toHaveTextContent(labels.shareFree);
    expect(screen.queryByText(labels.shareTitle)).not.toBeInTheDocument();
    expect(screen.getByTestId('settlement-free-note')).toHaveTextContent(labels.shareFreeNote);
    expect(screen.getByText('Asha Rao')).toBeInTheDocument();
    expect(screen.getByTestId('pod-complete-attendance-row-m-1')).toHaveTextContent(/^Asha Rao2 seats$/);
    expect(screen.queryByTestId('earnings-split')).not.toBeInTheDocument();
    expect(screen.queryByTestId('settlement-attendees')).not.toBeInTheDocument();
    expect(screen.queryByTestId('venue-bill-summary')).not.toBeInTheDocument();
    expect(container.textContent).not.toContain('₹');
  });

  it('keeps the amount on each roster row of a paid pod', async () => {
    preview([previewMock()]);
    await settle();

    expect(screen.getByTestId('pod-complete-attendance-row-m-1')).toHaveTextContent('2 seats · ₹500.00');
    expect(screen.queryByTestId('settlement-free')).not.toBeInTheDocument();
  });

  // The caller already knows the pod is free, so the heading never flashes
  // "Your share" while the settlement loads.
  it('reads as free before the settlement arrives when the caller says the pod is free', () => {
    preview([previewMock(FREE_SETTLEMENT)], { free: true });

    expect(screen.getByTestId('settlement-free')).toHaveTextContent(labels.shareFree);
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
  const extraInput = () =>
    within(screen.getByTestId('pod-complete-venue-extra')).getByRole('spinbutton');
  const enterBill = async (amount: string) => {
    fireEvent.change(billInput(), { target: { value: amount } });
    await settle();
  };
  const uploadBill = () => fireEvent.change(screen.getByLabelText('media'), { target: { value: BILL } });
  const submitForm = async () => {
    fireEvent.submit(document.querySelector('#pod-complete-form') as HTMLFormElement);
    await settle();
    await settle();
  };
  /** Past the preview's 350 ms settle, so it re-prices at what was typed. */
  const waitForPreview = async () => {
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 400);
      });
    });
  };

  // The venue's final bill is the proof of the agreed amount: a paid venue pod
  // cannot complete without its total and the bill itself.
  it('will not complete a paid venue pod without the venue’s final bill', async () => {
    const { mock, sent } = completeMock();
    const { props, notifySuccess } = dialog(VENUE_POD, [previewMock(), mediaBoardMock(), mock]);
    await settle();

    expect(screen.getByText(labels.venueBill.billTotalHint)).toBeInTheDocument();
    await submitForm();

    expect(screen.getByText(labels.venueBill.billRequired)).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent(labels.venueBill.billUploadRequired);
    expect(sent).toEqual([]);
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(props.onCompleted).not.toHaveBeenCalled();
  });

  // The bill, its file and the extra charges are all asked up front; the old
  // "pay the bill on top of the slot price" choice is gone.
  it('asks for the bill total, the bill itself and the extra charges, with no slot-price choice', async () => {
    dialog(VENUE_POD, [anyPreviewMock(), mediaBoardMock()]);
    await settle();

    expect(billInput()).toBeRequired();
    expect(screen.getByLabelText('media')).toBeInTheDocument();
    expect(extraInput()).not.toBeRequired();
    expect(screen.getByText(labels.venueBill.extraHint)).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('will not complete with a bill total and no bill uploaded', async () => {
    const { mock, sent } = completeMock();
    const { props, notifySuccess } = dialog(VENUE_POD, [anyPreviewMock(), mediaBoardMock(), mock]);
    await settle();

    await enterBill('450');
    await submitForm();

    expect(await screen.findByRole('alert')).toHaveTextContent(labels.venueBill.billUploadRequired);
    expect(screen.queryByText(labels.venueBill.billRequired)).not.toBeInTheDocument();
    expect(sent).toEqual([]);
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(props.onCompleted).not.toHaveBeenCalled();
  });

  it('will not complete with a bill total of zero or below', async () => {
    const { mock, sent } = completeMock();
    const { props } = dialog(VENUE_POD, [anyPreviewMock(), mediaBoardMock(), mock]);
    await settle();

    await enterBill('-5');
    uploadBill();
    await submitForm();

    expect(await screen.findByText(labels.venueBill.amountInvalid)).toBeInTheDocument();
    // The reason takes the hint's place under the field.
    expect(screen.queryByText(labels.venueBill.billTotalHint)).not.toBeInTheDocument();
    expect(sent).toEqual([]);
    expect(props.onCompleted).not.toHaveBeenCalled();
  });

  // Extra charges of 0 tell the server this build pays the agreed amount with
  // the bill as proof; the slot-price choice is never sent.
  it('sends the bill total, its file and extra charges of 0, and never include_slot_price', async () => {
    const { mock, sent } = completeMock();
    const { props, notifySuccess } = dialog(VENUE_POD, [anyPreviewMock(), mediaBoardMock(), mock]);
    await settle();

    await enterBill('450.50');
    uploadBill();
    await submitForm();

    expect(sent).toEqual([
      { pod_id: 'pod-1', venue_bill_amount: 450.5, venue_bill_url: BILL, venue_extra_amount: 0 },
    ]);
    expect(sent[0]).not.toHaveProperty('include_slot_price');
    expect(notifySuccess).toHaveBeenCalledWith(labels.venueBill.sentToFinance);
    expect(props.onCompleted).toHaveBeenCalledTimes(1);
  });

  it('sends the extra charges entered, and previews the split with them', async () => {
    const asked: Record<string, unknown>[] = [];
    const preview: MockedResponse = {
      request: {
        query: POD_SETTLEMENT_PREVIEW,
        variables: (variables: Record<string, unknown>) => {
          asked.push(variables);
          return true;
        },
      },
      result: { data: { podSettlementPreview: settlement() } },
      maxUsageCount: Number.POSITIVE_INFINITY,
    };
    const { mock, sent } = completeMock();
    dialog(VENUE_POD, [preview, mediaBoardMock(), mock]);
    await settle();

    await enterBill('450');
    uploadBill();
    fireEvent.change(extraInput(), { target: { value: '120' } });
    await waitForPreview();
    await settle();

    expect(asked[asked.length - 1]).toEqual({ pod_id: 'pod-1', venue_bill_amount: 450, venue_extra_amount: 120 });
    expect(asked.every((variables) => !('include_slot_price' in variables))).toBe(true);

    await submitForm();
    expect(sent).toEqual([
      { pod_id: 'pod-1', venue_bill_amount: 450, venue_bill_url: BILL, venue_extra_amount: 120 },
    ]);
  });

  it('will not complete with extra charges outside the server’s bound', async () => {
    const { mock, sent } = completeMock();
    dialog(VENUE_POD, [anyPreviewMock(), mediaBoardMock(), mock]);
    await settle();

    await enterBill('450');
    uploadBill();
    fireEvent.change(extraInput(), { target: { value: '-1' } });
    await submitForm();

    expect(await screen.findByText(labels.venueBill.extraInvalid)).toBeInTheDocument();
    expect(screen.queryByText(labels.venueBill.extraHint)).not.toBeInTheDocument();
    expect(sent).toEqual([]);
  });

  // The venue's usage prices its booking (a per-guest slot, overtime) beside the bill.
  it('sends the guests the venue charged for and the overtime hours with the bill', async () => {
    const { mock, sent } = completeMock();
    dialog(VENUE_POD, [anyPreviewMock(), mediaBoardMock(), mock]);
    await settle();

    expect(screen.getByText(labels.venueBill.paxHint)).toBeInTheDocument();
    await enterBill('450');
    uploadBill();
    fireEvent.change(within(screen.getByTestId('pod-complete-venue-pax')).getByRole('spinbutton'), {
      target: { value: '18' },
    });
    fireEvent.change(within(screen.getByTestId('pod-complete-overtime-hours')).getByRole('spinbutton'), {
      target: { value: '1.5' },
    });
    await settle();
    await submitForm();

    expect(sent).toEqual([
      {
        pod_id: 'pod-1',
        venue_bill_amount: 450,
        venue_bill_url: BILL,
        venue_extra_amount: 0,
        venue_pax: 18,
        overtime_hours: 1.5,
      },
    ]);
  });

  it('will not complete with a fractional guest count', async () => {
    const { mock, sent } = completeMock();
    dialog(VENUE_POD, [anyPreviewMock(), mediaBoardMock(), mock]);
    await settle();

    await enterBill('450');
    uploadBill();
    fireEvent.change(within(screen.getByTestId('pod-complete-venue-pax')).getByRole('spinbutton'), {
      target: { value: '2.5' },
    });
    await submitForm();

    expect(await screen.findByText(labels.venueBill.paxInvalid)).toBeInTheDocument();
    expect(sent).toEqual([]);
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

  // The host of a free pod settles the venue directly, so even on a venue pod
  // no bill is asked for, nothing is said about payouts and Finance gets nothing.
  it('completes a free venue pod with no bill to ask for and no payout promised', async () => {
    const { mock, sent } = completeMock();
    const { props, notifySuccess } = dialog({ ...VENUE_POD, pod_type: 'FREE' }, [
      previewMock(FREE_SETTLEMENT),
      mediaBoardMock(),
      mock,
    ]);
    await settle();

    expect(screen.queryByTestId('pod-complete-venue-bill-fields')).not.toBeInTheDocument();
    expect(screen.getByText(labels.completeHintFree)).toBeInTheDocument();
    expect(screen.queryByText(labels.completeHint)).not.toBeInTheDocument();
    expect(screen.getByTestId('settlement-free')).toHaveTextContent(labels.shareFree);
    await submitForm();

    expect(sent).toEqual([{ pod_id: 'pod-1', venue_bill_amount: 0 }]);
    expect(notifySuccess).toHaveBeenCalledWith(labels.shareFreeCompleted);
    expect(notifySuccess).not.toHaveBeenCalledWith(labels.venueBill.sentToFinance);
    expect(props.onCompleted).toHaveBeenCalledTimes(1);
  });

  it('keeps the payout hint on a paid pod', async () => {
    dialog({ ...VENUE_POD, pod_type: 'PAID' }, [previewMock(), mediaBoardMock()]);
    await settle();

    expect(screen.getByText(labels.completeHint)).toBeInTheDocument();
    expect(screen.getByTestId('pod-complete-venue-bill-fields')).toBeInTheDocument();
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
