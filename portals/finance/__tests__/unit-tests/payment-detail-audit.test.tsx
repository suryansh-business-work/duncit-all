import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import type { DateInput } from '@duncit/app-settings';
import ArtifactsTable from '../../src/pages/finance/payment-detail-page/ArtifactsTable';
import CheckoutTabs from '../../src/pages/finance/payment-detail-page/CheckoutTabs';
import ProductOrdersTable from '../../src/pages/finance/payment-detail-page/ProductOrdersTable';
import SegmentPanel from '../../src/pages/finance/payment-detail-page/SegmentPanel';
import StepsTimeline from '../../src/pages/finance/payment-detail-page/StepsTimeline';
import {
  CHECKOUT_TABS,
  defaultCheckoutTab,
  inSegment,
  segmentApplies,
  segmentHasFailure,
} from '../../src/pages/finance/payment-detail-page/checkout-segments';
import { renderWithProviders } from '../testkit';
import { resetTableControls, tableControls } from './mocks/table';
import {
  makeArtifact,
  makeDetailPayment,
  makeGiftCard,
  makePaymentDetail,
  makeProductOrder,
  makeStep,
  receiptArtifact,
  receiptStep,
} from '../mocks/payment-detail.mock';

const formatDateTime = (value: DateInput) => (typeof value === 'string' ? `on ${value}` : '');

/** Runs one searched pass first (so the row search text is built), then the plain listing. */
const searchThenList = (term: string) => {
  const [base] = tableControls.queries;
  tableControls.queries = [{ ...base, search: term }, base];
};

const cellTexts = (field: string) => screen.getAllByTestId(`cell-${field}`).map((cell) => cell.textContent);

const productOrderArtifact = (over: Parameters<typeof makeArtifact>[0] = {}) =>
  makeArtifact({ key: 'PRODUCT_ORDER', label: 'Product order(s)', segment: 'PRODUCT', ...over });

const giftCardArtifact = (over: Parameters<typeof makeArtifact>[0] = {}) =>
  makeArtifact({ key: 'GIFT_CARD_ISSUED', label: 'Gift card issued', segment: 'GIFT_CARD', refs: ['DUN-GIFT-9Q2X'], ...over });

/** A gift-card checkout: no pod on the payment, so the booking side never applies. */
const giftCardDetail = (over: Parameters<typeof makePaymentDetail>[0] = {}) =>
  makePaymentDetail({
    payment: makeDetailPayment({ target_type: 'GIFT_CARD', description: 'Duncit gift card', ticket_discount_amount: 0, ticket_discount_pct: 0 }),
    pod_booking: null,
    ...over,
  });

const tab = (value: string) => {
  const found = CHECKOUT_TABS.find((entry) => entry.value === value);
  if (!found) throw new Error(`no checkout tab ${value}`);
  return found;
};

beforeEach(() => {
  resetTableControls();
});

describe('ArtifactsTable', () => {
  it('reads each row back as created, not applicable or missing, and re-runs the missing one', async () => {
    const onRetry = vi.fn();
    searchThenList('coins');
    renderWithProviders(
      <ArtifactsTable
        tableId="finance-payment-artifacts"
        busyKey={null}
        onRetry={onRetry}
        artifacts={[
          makeArtifact(),
          receiptArtifact(),
          makeArtifact({ key: 'LINK_ATTRIBUTION', label: 'Marketing attribution', created: false, count: 0, refs: [], not_applicable: true }),
          makeArtifact({ key: 'COINS_EARNED', label: 'Coins earned back', refs: ['20 coins', 'ledger_22'], count: 2 }),
        ]}
      />,
    );

    expect(await screen.findAllByTestId('table-row')).toHaveLength(4);
    expect(cellTexts('created')).toEqual(['Created', 'Missing', 'Not applicable', 'Created']);
    const refs = screen.getAllByTestId('cell-refs');
    expect(refs[0]).toHaveTextContent('pay_Nx12Razor');
    expect(refs[1]).toHaveTextContent('—');
    expect(refs[3]).toHaveTextContent('20 coins, ledger_22');
    expect(refs[3]).toHaveTextContent('2 records');
    expect(refs[0]).not.toHaveTextContent('records');

    // Only the missing row the server can re-create carries a Retry.
    expect(cellTexts('retry_key').filter(Boolean)).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Re-run Receipt e-mailed' }));
    expect(onRetry).toHaveBeenCalledWith('RECEIPT_EMAIL');
  });

  it('drops the action column when nothing can be re-run', async () => {
    renderWithProviders(
      <ArtifactsTable tableId="t" busyKey={null} onRetry={vi.fn()} artifacts={[makeArtifact(), receiptArtifact({ retry_key: null })]} />,
    );
    expect(await screen.findAllByTestId('table-row')).toHaveLength(2);
    expect(screen.queryByTestId('cell-retry_key')).not.toBeInTheDocument();
  });

  it('says so when checkout recorded nothing', async () => {
    renderWithProviders(<ArtifactsTable tableId="t" busyKey={null} onRetry={vi.fn()} artifacts={[]} />);
    expect(await screen.findByText('Nothing was recorded for this payment.')).toBeInTheDocument();
  });
});

describe('StepsTimeline', () => {
  it('explains an empty pipeline', () => {
    renderWithProviders(<StepsTimeline steps={[]} busyKey={null} onRetry={vi.fn()} formatDateTime={formatDateTime} />);
    expect(screen.getByRole('heading', { name: 'Pipeline steps' })).toBeInTheDocument();
    expect(screen.getByText(/finalized before step tracking shipped/)).toBeInTheDocument();
  });

  it('shows when each step ran, why one failed, and re-runs it', () => {
    const onRetry = vi.fn();
    renderWithProviders(
      <StepsTimeline
        steps={[makeStep(), receiptStep({ at: null })]}
        busyKey={null}
        onRetry={onRetry}
        formatDateTime={formatDateTime}
      />,
    );
    expect(screen.getByText('on 2026-09-01T10:00:00.000Z')).toBeInTheDocument();
    expect(screen.getByText('not run')).toBeInTheDocument();
    expect(screen.getByText('SMTP timeout after 30s')).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Re-run Receipt e-mailed' }));
    expect(onRetry).toHaveBeenCalledWith('RECEIPT_EMAIL');
  });

  it('spins the row being re-run and locks it', () => {
    renderWithProviders(
      <StepsTimeline steps={[receiptStep()]} busyKey="RECEIPT_EMAIL" onRetry={vi.fn()} formatDateTime={formatDateTime} />,
    );
    const button = screen.getByRole('button', { name: 'Re-run Receipt e-mailed' });
    expect(button).toBeDisabled();
    expect(within(button).getByRole('progressbar')).toBeInTheDocument();
    expect(within(button).queryByTestId('ReplayIcon')).toBeNull();
  });
});

describe('ProductOrdersTable', () => {
  it('lists every order with its total and AWB, dashing a pickup with none', async () => {
    searchThenList('awb');
    renderWithProviders(
      <ProductOrdersTable
        currencySymbol="₹"
        orders={[
          makeProductOrder(),
          makeProductOrder({ id: 'ord2', order_no: 'DUN-ORD-1002', fulfilment_method: 'PICKUP', fulfilment_status: 'READY', total: 250, item_count: 1, awb: null }),
        ]}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Product orders' })).toBeInTheDocument();
    expect(await screen.findAllByTestId('table-row')).toHaveLength(2);
    expect(cellTexts('total')).toEqual(['₹499.00', '₹250.00']);
    expect(cellTexts('awb')).toEqual(['AWB123456789', '—']);
  });
});

describe('SegmentPanel', () => {
  it('says so when the payment bought nothing of that kind', () => {
    renderWithProviders(
      <SegmentPanel detail={makePaymentDetail()} tab={tab('product')} busyKey={null} onRetry={vi.fn()} formatDateTime={formatDateTime} />,
    );
    expect(screen.getByText('This payment bought no products.')).toBeInTheDocument();
  });

  it('shows the product orders a product checkout produced', async () => {
    const detail = makePaymentDetail({
      artifacts: [productOrderArtifact({ refs: ['DUN-ORD-1001'] })],
      product_orders: [makeProductOrder()],
    });
    renderWithProviders(
      <SegmentPanel detail={detail} tab={tab('product')} busyKey={null} onRetry={vi.fn()} formatDateTime={formatDateTime} />,
    );
    expect(screen.getByRole('heading', { name: 'Product orders' })).toBeInTheDocument();
    expect(await screen.findByText('DUN-ORD-1001', { selector: '[data-testid="cell-order_no"]' })).toBeInTheDocument();
  });

  it('leaves out the orders block when the orders were never written', async () => {
    const detail = makePaymentDetail({
      artifacts: [productOrderArtifact({ created: false, count: 0, refs: [] })],
      product_orders: [],
    });
    renderWithProviders(
      <SegmentPanel detail={detail} tab={tab('product')} busyKey={null} onRetry={vi.fn()} formatDateTime={formatDateTime} />,
    );
    expect(screen.queryByRole('heading', { name: 'Product orders' })).not.toBeInTheDocument();
    expect(await screen.findByText('Missing')).toBeInTheDocument();
  });

  it('shows the gift card a gift-card checkout issued', () => {
    const detail = giftCardDetail({ artifacts: [giftCardArtifact()], gift_card: makeGiftCard() });
    renderWithProviders(
      <SegmentPanel detail={detail} tab={tab('giftcard')} busyKey={null} onRetry={vi.fn()} formatDateTime={formatDateTime} />,
    );
    expect(screen.getByRole('heading', { name: 'Gift card' })).toBeInTheDocument();
    expect(screen.getByText('Code').nextElementSibling).toHaveTextContent('DUN-GIFT-9Q2X');
  });

  it('leaves out the card block when the card was never issued', async () => {
    const detail = giftCardDetail({
      artifacts: [giftCardArtifact({ created: false, count: 0, refs: [] })],
      gift_card: null,
    });
    renderWithProviders(
      <SegmentPanel detail={detail} tab={tab('giftcard')} busyKey={null} onRetry={vi.fn()} formatDateTime={formatDateTime} />,
    );
    expect(screen.queryByRole('heading', { name: 'Gift card' })).not.toBeInTheDocument();
    expect(await screen.findByText('Missing')).toBeInTheDocument();
  });
});

describe('CheckoutTabs', () => {
  it('opens on the gift card a gift-card payment bought and flags its missing e-mail', () => {
    const detail = giftCardDetail({
      artifacts: [
        makeArtifact({ key: 'POD_SEAT', label: 'Seat held in the pod', segment: 'POD', created: false, count: 0, refs: [], not_applicable: true }),
        giftCardArtifact(),
        giftCardArtifact({ key: 'GIFT_CARD_EMAIL', label: 'Gift card e-mailed', created: false, count: 0, refs: [], retry_key: 'GIFT_CARD_EMAIL' }),
      ],
      gift_card: makeGiftCard(),
    });
    renderWithProviders(<CheckoutTabs detail={detail} busyKey={null} onRetry={vi.fn()} formatDateTime={formatDateTime} />);

    const giftTab = screen.getByRole('tab', { name: 'Gift card' });
    expect(giftTab).toHaveAttribute('aria-selected', 'true');
    expect(within(giftTab).getByTestId('ErrorOutlinedIcon')).toBeInTheDocument();
    expect(within(screen.getByRole('tab', { name: 'Pod' })).queryByTestId('ErrorOutlinedIcon')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Gift card' })).toBeInTheDocument();
  });
});

describe('checkout-segments', () => {
  const rows = [
    makeArtifact(),
    productOrderArtifact({ created: false, count: 0, refs: [] }),
    giftCardArtifact({ created: false, count: 0, refs: [], not_applicable: true }),
  ];

  it('files rows under their segment', () => {
    expect(inSegment(rows, 'PRODUCT').map((row) => row.key)).toEqual(['PRODUCT_ORDER']);
  });

  it('knows what the payment bought and what it failed to create', () => {
    expect(segmentApplies(rows, 'PRODUCT')).toBe(true);
    expect(segmentApplies(rows, 'GIFT_CARD')).toBe(false);
    expect(segmentHasFailure(rows, 'PRODUCT')).toBe(true);
    expect(segmentHasFailure(rows, 'GIFT_CARD')).toBe(false);
    expect(segmentHasFailure(rows, 'PAYMENT')).toBe(false);
  });

  it('opens on the first thing bought, or the pod tab when nothing applies', () => {
    expect(defaultCheckoutTab(rows)).toBe('product');
    expect(defaultCheckoutTab([makeArtifact()])).toBe('pod');
  });
});
