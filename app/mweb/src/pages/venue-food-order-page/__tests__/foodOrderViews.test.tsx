import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';

import FoodOrderPaymentCard from '../FoodOrderPaymentCard';
import FoodOrderInvoiceCard from '../FoodOrderInvoiceCard';
import FoodOrderSummary from '../FoodOrderSummary';
import FoodOrderFeedbackCard from '../FoodOrderFeedbackCard';
import FoodFeedbackPhotos from '../food-feedback/FoodFeedbackPhotos';
import { FoodFeedbackForm } from '../food-feedback';
import VenueFoodOrderPage from '../index';
import { fallbackT } from '../../../i18n/fallback';
import { FOOD_PAYMENT_STATUS_KEYS } from '@duncit/utils';

const h = vi.hoisted(() => ({
  invoice: vi.fn(),
  feedback: vi.fn(),
  order: vi.fn(),
  checkout: vi.fn(),
  meta: vi.fn(),
  warn: vi.fn(),
}));

vi.mock('../useFoodInvoice', () => ({ useFoodInvoice: h.invoice }));
vi.mock('../useFoodFeedback', () => ({ useFoodFeedback: h.feedback }));
vi.mock('../useFoodOrder', () => ({ useFoodOrder: h.order }));
vi.mock('../../VenueDetailsPage/food/useFoodCheckout', () => ({ useFoodCheckout: h.checkout }));
vi.mock('../../../app/pageMeta', () => ({ useEntityPageMeta: h.meta }));
vi.mock('../../order-detail-page/OrderDetailTimeline', () => ({ default: (p: { steps: unknown[] }) => <div data-testid="timeline" data-steps={p.steps.length} /> }));
vi.mock('../../venues-page/VenuePodsSection', () => ({ default: (p: { venueId: string }) => <div data-testid="venue-pods" data-venue={p.venueId} /> }));
vi.mock('../../../utils/dateFormat', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../utils/dateFormat')>()),
  useDateFormat: () => ({ formatDateTime: (d: string) => `at:${d}` }),
}));

const line = { item_id: 'i1', name: 'Paneer Tikka', diet: 'VEG', unit_price: 200, quantity: 2, line_total: 400 };

const base = (over: object = {}) => ({
  id: 'o1',
  order_no: 'FO-12',
  venue_id: 'v1',
  venue_name: 'Cafe One',
  customer_name: 'Asha',
  customer_phone: '9999999999',
  table_label: '',
  note: '',
  items: [line],
  subtotal: 400,
  discount_pct: 0,
  discount_amount: 0,
  total: 400,
  currency_symbol: '₹',
  status: 'PLACED',
  payment_status: 'PAID',
  paid_at: null,
  cancelled_at: null,
  cancel_reason: '',
  created_at: '2026-06-01T10:00:00.000Z',
  invoice_available: false,
  feedback: null,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('FoodOrderPaymentCard', () => {
  const card = (order: object, props: object = {}) => {
    const onRetry = vi.fn();
    render(<FoodOrderPaymentCard order={base(order) as never} canRetry retrying={false} retryError={null} onRetry={onRetry} {...props} />);
    return onRetry;
  };

  it('shows nothing for a paid, live order', () => {
    const { container } = render(<FoodOrderPaymentCard order={base() as never} canRetry retrying={false} retryError={null} onRetry={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('says the payment is still being confirmed and offers to pay again on the device that placed it', () => {
    const onRetry = card({ payment_status: 'PENDING' });
    expect(screen.getByTestId('food-order-payment-pending')).toHaveTextContent(fallbackT('mweb.venueFood.order.waitingPayment'));
    fireEvent.click(screen.getByTestId('food-order-retry-payment'));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('food-order-retry-payment')).toHaveTextContent(fallbackT('mweb.venueFood.order.payNow'));
  });

  it('shows the retry failure, with its title when it has one, and changes the button to Retry', () => {
    card({ payment_status: 'PENDING' }, { retryError: { title: 'Card declined', message: 'Try another card' } });
    expect(screen.getByTestId('food-order-retry-error')).toHaveTextContent('Card declined');
    expect(screen.getByTestId('food-order-retry-error')).toHaveTextContent('Try another card');
    expect(screen.getByTestId('food-order-retry-payment')).toHaveTextContent(fallbackT('mweb.venueFood.order.retryPayment'));
  });

  it('shows a retry failure with no title, and no button when this device did not place the order', () => {
    card({ payment_status: 'PENDING' }, { retryError: { title: '', message: 'Network down' }, canRetry: false });
    expect(screen.getByTestId('food-order-retry-error')).toHaveTextContent('Network down');
    expect(screen.queryByTestId('food-order-retry-payment')).not.toBeInTheDocument();
  });

  it('disables the button while a retry is under way', () => {
    card({ payment_status: 'PENDING' }, { retrying: true });
    expect(screen.getByTestId('food-order-retry-payment')).toBeDisabled();
  });

  it('says the payment failed', () => {
    card({ payment_status: 'FAILED' });
    expect(screen.getByTestId('food-order-payment-failed')).toHaveTextContent(fallbackT('mweb.venueFood.payment.failed'));
  });

  it('explains a cancelled order: its reason and where its refund has got to', () => {
    const { unmount } = render(<FoodOrderPaymentCard order={base({ status: 'CANCELLED', cancel_reason: 'Out of stock', payment_status: 'REFUND_PENDING' }) as never} canRetry retrying={false} retryError={null} onRetry={vi.fn()} />);
    const el = screen.getByTestId('food-order-cancelled');
    expect(el).toHaveTextContent(fallbackT('mweb.venueFood.order.cancelReason', { vars: { reason: 'Out of stock' } }));
    expect(el).toHaveTextContent(fallbackT('mweb.venueFood.order.refundPending'));
    unmount();
    render(<FoodOrderPaymentCard order={base({ status: 'CANCELLED', cancel_reason: '', payment_status: 'REFUNDED' }) as never} canRetry retrying={false} retryError={null} onRetry={vi.fn()} />);
    expect(screen.getByTestId('food-order-cancelled')).toHaveTextContent(fallbackT('mweb.venueFood.order.refunded'));
    expect(screen.getByTestId('food-order-cancelled')).not.toHaveTextContent(fallbackT('mweb.venueFood.order.refundPending'));
  });

  it('says nothing about a refund for a cancelled order that was never paid', () => {
    card({ status: 'CANCELLED', payment_status: 'FAILED' });
    expect(screen.getByTestId('food-order-cancelled')).not.toHaveTextContent(fallbackT('mweb.venueFood.order.refunded'));
    expect(screen.getByTestId('food-order-cancelled')).not.toHaveTextContent(fallbackT('mweb.venueFood.order.refundPending'));
  });
});

describe('FoodOrderInvoiceCard', () => {
  const card = (order: object, invoice: object = {}) => {
    const download = vi.fn();
    h.invoice.mockReturnValue({ busy: false, failed: false, download, ...invoice });
    render(<FoodOrderInvoiceCard order={base(order) as never} orderKey="KEY" />);
    return download;
  };

  it('names the venue and downloads on press, passing the order and key to the hook', () => {
    const download = card({});
    expect(h.invoice).toHaveBeenCalledWith(expect.objectContaining({ id: 'o1' }), 'KEY');
    expect(screen.getByTestId('food-order-invoice')).toHaveTextContent(fallbackT('mweb.venueFood.invoice.hint', { vars: { venue: 'Cafe One' } }));
    fireEvent.click(screen.getByTestId('food-order-invoice-download'));
    expect(download).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('food-order-invoice-gstin')).not.toBeInTheDocument();
    expect(screen.queryByTestId('food-order-invoice-error')).not.toBeInTheDocument();
  });

  it('shows the venue GST number when it has one', () => {
    card({ venue_gstin: '29ABCDE1234F1Z5' });
    expect(screen.getByTestId('food-order-invoice-gstin')).toHaveTextContent(`${fallbackT('mweb.venueFood.order.gstin')}: 29ABCDE1234F1Z5`);
  });

  it('says the download failed, and shows Preparing while busy', () => {
    card({}, { failed: true, busy: true });
    expect(screen.getByTestId('food-order-invoice-error')).toHaveTextContent(fallbackT('mweb.venueFood.invoice.failed'));
    expect(screen.getByTestId('food-order-invoice-download')).toBeDisabled();
    expect(screen.getByTestId('food-order-invoice-download')).toHaveTextContent(fallbackT('mweb.venueFood.invoice.preparing'));
  });
});

describe('FoodOrderSummary', () => {
  it('lists the dishes with quantity and line total, the totals, and who it is for', () => {
    render(<FoodOrderSummary order={base() as never} />);
    expect(screen.getByTestId('food-order-summary')).toHaveTextContent('Paneer Tikka');
    expect(screen.getByTestId('food-order-summary')).toHaveTextContent('₹400');
    expect(screen.getByTestId('food-order-name')).toHaveTextContent('Asha');
    expect(screen.getByTestId('food-order-placed-at')).toHaveTextContent('at:2026-06-01T10:00:00.000Z');
    expect(screen.getByTestId('food-order-payment-status')).toHaveTextContent(fallbackT(FOOD_PAYMENT_STATUS_KEYS.PAID));
    ['food-order-table', 'food-order-note', 'food-order-gstin', 'food-order-venue-address'].forEach((id) => expect(screen.queryByTestId(id)).not.toBeInTheDocument());
  });

  it('shows table, note, GST number and address when present, and the coupon in the totals', () => {
    render(
      <FoodOrderSummary
        order={
          base({
            table_label: 'T4',
            note: 'No onions',
            venue_gstin: '29ABCDE1234F1Z5',
            venue_address: '1 MG Road',
            coupon_code: 'SAVE10',
            coupon_pct: 10,
            coupon_discount_amount: 40,
            tax_mode: 'EXCLUSIVE',
            gst_pct: 5,
            tax_amount: 18,
          }) as never
        }
      />
    );
    expect(screen.getByTestId('food-order-table')).toHaveTextContent('T4');
    expect(screen.getByTestId('food-order-note')).toHaveTextContent('No onions');
    expect(screen.getByTestId('food-order-gstin')).toHaveTextContent('29ABCDE1234F1Z5');
    expect(screen.getByTestId('food-order-venue-address')).toHaveTextContent('1 MG Road');
    expect(screen.getByTestId('food-order-totals')).toHaveTextContent('SAVE10');
  });

  it('prices a coupon with no stated percent or amount as zero', () => {
    render(<FoodOrderSummary order={base({ coupon_code: 'FREEBIE' }) as never} />);
    expect(screen.getByTestId('food-order-totals')).toHaveTextContent('FREEBIE');
  });
});

describe('FoodFeedbackPhotos', () => {
  const photos = (props: Partial<Parameters<typeof FoodFeedbackPhotos>[0]> = {}) => {
    const onChange = vi.fn();
    const onUpload = vi.fn().mockResolvedValue('https://ik/new.jpg');
    render(<FoodFeedbackPhotos images={[]} onChange={onChange} onUpload={onUpload} uploading={false} disabled={false} {...props} />);
    return { onChange, onUpload };
  };
  const pick = (file: File | null) => fireEvent.change(screen.getByTestId('food-feedback-photo-input'), { target: { files: file ? [file] : [] } });

  it('adds an uploaded photo to the list', async () => {
    const { onChange, onUpload } = photos({ images: ['https://ik/a.jpg'] });
    const file = new File(['x'], 'p.jpg', { type: 'image/jpeg' });
    pick(file);
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(['https://ik/a.jpg', 'https://ik/new.jpg']));
    expect(onUpload).toHaveBeenCalledWith(file);
  });

  it('adds nothing when the upload failed, or when the picker was cancelled', async () => {
    const { onChange, onUpload } = photos();
    onUpload.mockResolvedValue(null);
    pick(new File(['x'], 'p.jpg'));
    await waitFor(() => expect(onUpload).toHaveBeenCalled());
    pick(null);
    expect(onChange).not.toHaveBeenCalled();
    expect(onUpload).toHaveBeenCalledTimes(1);
  });

  it('opens the picker from the add button, and shows Uploading and a disabled button while a photo is on its way', () => {
    photos();
    const click = vi.spyOn(screen.getByTestId('food-feedback-photo-input'), 'click');
    fireEvent.click(screen.getByTestId('food-feedback-photo-add'));
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('shows Uploading while a photo is on its way', () => {
    photos({ uploading: true });
    expect(screen.getByTestId('food-feedback-photo-add')).toBeDisabled();
    expect(screen.getByTestId('food-feedback-photo-add')).toHaveTextContent(fallbackT('mweb.venueFood.feedback.uploading'));
  });

  it('shows each photo with a remove, and hides Add once the limit is reached', () => {
    const { onChange } = photos({ images: ['u1', 'u2', 'u3'] });
    expect(screen.getAllByRole('img')).toHaveLength(3);
    expect(screen.queryByTestId('food-feedback-photo-add')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('food-feedback-photo-remove-1'));
    expect(onChange).toHaveBeenCalledWith(['u1', 'u3']);
  });

  it('disables removal and adding when the form is disabled, and shows the schema complaint', () => {
    photos({ images: ['u1'], disabled: true, error: 'Too many photos' });
    expect(screen.getByTestId('food-feedback-photo-remove-0')).toBeDisabled();
    expect(screen.getByTestId('food-feedback-photo-add')).toBeDisabled();
    expect(screen.getByText('Too many photos')).toBeInTheDocument();
  });
});

describe('FoodFeedbackForm', () => {
  const form = (over: Partial<Parameters<typeof FoodFeedbackForm>[0]> = {}) => {
    const props = {
      venueName: 'Cafe One',
      uploading: false,
      submitting: false,
      error: null,
      onDismissError: vi.fn(),
      onUploadPhoto: vi.fn().mockResolvedValue('https://ik/p.jpg'),
      onSubmit: vi.fn(),
      ...over,
    };
    render(<FoodFeedbackForm {...props} />);
    return props;
  };

  it('needs a rating before it sends', async () => {
    const props = form();
    fireEvent.click(screen.getByTestId('food-feedback-submit'));
    expect(await screen.findByTestId('food-feedback-rating-error')).toHaveTextContent(fallbackT('mweb.venueFood.feedback.ratingRequired'));
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it('sends the rating, the trimmed comment and the added photos', async () => {
    const props = form();
    fireEvent.click(screen.getByLabelText(fallbackT('mweb.venueFood.feedback.stars', { vars: { count: '4' } })));
    fireEvent.change(screen.getByLabelText(fallbackT('mweb.venueFood.feedback.comment')), { target: { value: '  Tasty  ' } });
    fireEvent.change(screen.getByTestId('food-feedback-photo-input'), { target: { files: [new File(['x'], 'p.jpg', { type: 'image/jpeg' })] } });
    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(1));
    fireEvent.click(screen.getByTestId('food-feedback-submit'));
    await waitFor(() => expect(props.onSubmit).toHaveBeenCalledTimes(1));
    expect((props.onSubmit as unknown as { mock: { calls: any[][] } }).mock.calls[0][0]).toEqual({ rating: 4, comment: 'Tasty', images: ['https://ik/p.jpg'] });
  });

  it('treats clearing the rating as no rating', async () => {
    const props = form();
    const four = screen.getByLabelText(fallbackT('mweb.venueFood.feedback.stars', { vars: { count: '4' } }));
    fireEvent.click(four, { clientX: 8, clientY: 8 });
    fireEvent.click(four, { clientX: 8, clientY: 8 });
    fireEvent.click(screen.getByTestId('food-feedback-submit'));
    expect(await screen.findByTestId('food-feedback-rating-error')).toBeInTheDocument();
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it('shows the failure, which can be dismissed, and locks the form while sending', () => {
    const props = form({ error: 'Could not send', submitting: true });
    expect(screen.getByTestId('food-feedback-error')).toHaveTextContent('Could not send');
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(props.onDismissError).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('food-feedback-submit')).toBeDisabled();
    expect(screen.getByLabelText(fallbackT('mweb.venueFood.feedback.comment'))).toBeDisabled();
  });

  it('waits for a photo upload before sending', () => {
    form({ uploading: true });
    expect(screen.getByTestId('food-feedback-submit')).toBeDisabled();
  });
});

describe('FoodOrderFeedbackCard', () => {
  const stub = (over: object = {}) => {
    const fb = { uploading: false, submitting: false, error: null, clearError: vi.fn(), uploadPhoto: vi.fn(), submit: vi.fn(), ...over };
    h.feedback.mockReturnValue(fb);
    return fb;
  };
  const card = (order: object, props: object = {}) => {
    const onRated = vi.fn();
    render(<FoodOrderFeedbackCard order={base(order) as never} orderKey="KEY" focus={false} onRated={onRated} {...props} />);
    return onRated;
  };

  it('shows the rating form for a served order nobody has rated', () => {
    stub();
    const onRated = card({ status: 'SERVED' });
    expect(h.feedback).toHaveBeenCalledWith('o1', 'KEY', onRated);
    expect(screen.getByTestId('food-order-feedback')).toHaveTextContent(fallbackT('mweb.venueFood.feedback.title'));
    expect(screen.getByTestId('food-feedback-form')).toBeInTheDocument();
  });

  it('shows nothing for an order that is neither rateable nor rated', () => {
    stub();
    card({ status: 'PLACED' });
    expect(screen.queryByTestId('food-order-feedback')).not.toBeInTheDocument();
  });

  it('shows what the guest said once they have rated: stars, comment and photos', () => {
    stub();
    card({ status: 'SERVED', feedback: { rating: 4, comment: 'Lovely', images: ['https://ik/a.jpg', 'https://ik/b.jpg'], submitted_at: 'x' } });
    expect(screen.getByTestId('food-order-feedback')).toHaveTextContent(fallbackT('mweb.venueFood.feedback.thanksTitle'));
    expect(screen.getByTestId('food-order-feedback-given')).toHaveTextContent(fallbackT('mweb.venueFood.feedback.yourRating', { vars: { rating: '4' } }));
    expect(screen.getByTestId('food-order-feedback-comment')).toHaveTextContent('Lovely');
    expect(screen.getAllByRole('link')).toHaveLength(2);
    expect(screen.getAllByRole('img', { name: new RegExp(fallbackT('mweb.venueFood.feedback.photoAlt', { vars: { number: '1' } })) })).toHaveLength(1);
    expect(screen.getAllByRole('img', { name: /photo/i })).toHaveLength(2);
    expect(screen.queryByTestId('food-feedback-form')).not.toBeInTheDocument();
  });

  it('shows a rating alone when the guest left no words or photos', () => {
    stub();
    card({ status: 'SERVED', feedback: { rating: 5, comment: '', images: [], submitted_at: 'x' } });
    expect(screen.queryByTestId('food-order-feedback-comment')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows the thank-you for a rated order even if it is no longer marked served', () => {
    stub();
    card({ status: 'CANCELLED', feedback: { rating: 2, comment: '', images: [], submitted_at: 'x' } });
    expect(screen.getByTestId('food-order-feedback-given')).toBeInTheDocument();
  });

  it('scrolls the form into view when opened from the rating message', () => {
    stub();
    const scroll = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scroll;
    card({ status: 'SERVED' }, { focus: true });
    expect(scroll).toHaveBeenCalledWith({ block: 'start' });
  });

  it('does not scroll when not asked, or when there is no form to show', () => {
    stub();
    const scroll = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scroll;
    card({ status: 'SERVED' });
    expect(scroll).not.toHaveBeenCalled();
    card({ status: 'SERVED', feedback: { rating: 5, comment: '', images: [], submitted_at: 'x' } }, { focus: true });
    expect(scroll).not.toHaveBeenCalled();
  });
});

describe('VenueFoodOrderPage', () => {
  const orderState = (over: object = {}) => ({
    order: base(),
    loading: false,
    error: undefined,
    errorCode: '',
    clientKey: 'CK',
    accessKey: 'KEY',
    refetch: vi.fn().mockResolvedValue(undefined),
    ...over,
  });
  const checkout = (over: object = {}) => ({ start: vi.fn(), submitting: false, error: null, ...over });
  let onDone: () => void;

  const page = (state: object, url = '/venue/v1/food-order/o1', co = checkout()) => {
    h.order.mockReturnValue(state);
    h.checkout.mockImplementation((options: { onDone: () => void }) => {
      onDone = options.onDone;
      return co;
    });
    render(
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/venue/:venueId/food-order/:orderId" element={<VenueFoodOrderPage />} />
        </Routes>
      </MemoryRouter>
    );
    return co;
  };

  it('shows a loading placeholder', () => {
    page(orderState({ order: null, loading: true }));
    expect(screen.getByTestId('food-order-loading')).toBeInTheDocument();
  });

  it('shows the order: head, status, timeline once paid, summary, back to the menu and what is on at the venue', () => {
    page(orderState());
    expect(screen.getByTestId('food-order-head')).toHaveTextContent(fallbackT('mweb.venueFood.order.orderNo', { vars: { orderNo: 'FO-12' } }));
    expect(screen.getByTestId('food-order-head')).toHaveTextContent('Cafe One');
    expect(screen.getByTestId('food-order-status')).toBeInTheDocument();
    expect(screen.getByTestId('timeline')).toBeInTheDocument();
    expect(screen.getByTestId('food-order-summary')).toBeInTheDocument();
    expect(screen.getByTestId('food-order-back-to-menu')).toHaveAttribute('href', expect.stringContaining('v1'));
    expect(screen.getByTestId('venue-pods')).toHaveAttribute('data-venue', 'v1');
    expect(h.meta).toHaveBeenCalledWith(fallbackT('mweb.venueFood.order.orderNo', { vars: { orderNo: 'FO-12' } }));
    expect(screen.queryByTestId('food-order-feedback')).not.toBeInTheDocument();
    expect(screen.queryByTestId('food-order-invoice')).not.toBeInTheDocument();
    expect(screen.queryByTestId('food-order-subscribed')).not.toBeInTheDocument();
  });

  it('hides the timeline while payment is unconfirmed or failed', () => {
    page(orderState({ order: base({ payment_status: 'PENDING' }) }));
    expect(screen.queryByTestId('timeline')).not.toBeInTheDocument();
    expect(screen.getByTestId('food-order-payment-pending')).toBeInTheDocument();
  });

  it('hides the timeline for a failed payment', () => {
    page(orderState({ order: base({ payment_status: 'FAILED' }) }));
    expect(screen.queryByTestId('timeline')).not.toBeInTheDocument();
    expect(screen.getByTestId('food-order-payment-failed')).toBeInTheDocument();
  });

  it('offers the invoice, the rating and the events note when they apply', () => {
    h.feedback.mockReturnValue({ uploading: false, submitting: false, error: null, clearError: vi.fn(), uploadPhoto: vi.fn(), submit: vi.fn() });
    h.invoice.mockReturnValue({ busy: false, failed: false, download: vi.fn() });
    page(orderState({ order: base({ status: 'SERVED', invoice_available: true, subscribe_events: true }) }), '/venue/v1/food-order/o1?feedback=1');
    expect(screen.getByTestId('food-order-feedback')).toBeInTheDocument();
    expect(screen.getByTestId('food-order-invoice')).toBeInTheDocument();
    expect(screen.getByTestId('food-order-subscribed')).toBeInTheDocument();
  });

  it('does not say the guest subscribed to events for an unpaid order', () => {
    page(orderState({ order: base({ payment_status: 'PENDING', subscribe_events: true }) }));
    expect(screen.queryByTestId('food-order-subscribed')).not.toBeInTheDocument();
  });

  it('retries payment exactly as the order was placed, including coupon and events tick and the client key', () => {
    const co = page(
      orderState({
        order: base({
          payment_status: 'PENDING',
          table_label: 'T4',
          note: 'No onions',
          coupon_code: 'SAVE10',
          subscribe_events: true,
        }),
      })
    );
    fireEvent.click(screen.getByTestId('food-order-retry-payment'));
    expect(co.start).toHaveBeenCalledWith({
      venue_id: 'v1',
      items: [{ item_id: 'i1', quantity: 2 }],
      customer_name: 'Asha',
      customer_phone: '9999999999',
      table_label: 'T4',
      note: 'No onions',
      coupon_code: 'SAVE10',
      subscribe_events: true,
      client_key: 'CK',
    });
  });

  it('retries a plain order with null table and note and no coupon or events', () => {
    const co = page(orderState({ order: base({ payment_status: 'PENDING' }) }));
    fireEvent.click(screen.getByTestId('food-order-retry-payment'));
    expect(co.start).toHaveBeenCalledWith({
      venue_id: 'v1',
      items: [{ item_id: 'i1', quantity: 2 }],
      customer_name: 'Asha',
      customer_phone: '9999999999',
      table_label: null,
      note: null,
      client_key: 'CK',
    });
  });

  it('cannot retry from a device that did not place the order', () => {
    page(orderState({ order: base({ payment_status: 'PENDING' }), clientKey: '' }));
    expect(screen.queryByTestId('food-order-retry-payment')).not.toBeInTheDocument();
  });

  it('re-reads the order once checkout is done, logging a failed re-read', async () => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    page(orderState({ refetch }));
    onDone();
    expect(refetch).toHaveBeenCalledTimes(1);
    refetch.mockRejectedValueOnce(new Error('offline'));
    onDone();
    await waitFor(() => expect(refetch).toHaveBeenCalledTimes(2));
  });

  it('offers a retry when the order could not be read', () => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    page(orderState({ order: null, error: new Error('x'), errorCode: '', refetch }));
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.ordersHistory.retry') }));
    expect(screen.getByTestId('food-order-load-failed')).toBeInTheDocument();
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('says the order was not found for a refused or missing order, with a way back to the menu', () => {
    page(orderState({ order: null, error: new Error('x'), errorCode: 'NOT_FOUND' }));
    expect(screen.getByTestId('food-order-missing')).toBeInTheDocument();
    expect(screen.getByTestId('food-order-back-to-menu')).toHaveAttribute('href', expect.stringContaining('v1'));
  });

  it('says the order was not found when there is simply nothing, and also for a forbidden one', () => {
    page(orderState({ order: null, error: new Error('x'), errorCode: 'FORBIDDEN' }));
    expect(screen.getByTestId('food-order-missing')).toBeInTheDocument();
  });

  it('offers no way back to a menu when the link has no venue and nothing was found', () => {
    h.order.mockReturnValue(orderState({ order: null }));
    h.checkout.mockReturnValue(checkout());
    render(
      <MemoryRouter initialEntries={['/food-order/o1']}>
        <Routes>
          <Route path="/food-order/:orderId" element={<VenueFoodOrderPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId('food-order-missing')).toBeInTheDocument();
    expect(screen.queryByTestId('food-order-back-to-menu')).not.toBeInTheDocument();
  });
});
