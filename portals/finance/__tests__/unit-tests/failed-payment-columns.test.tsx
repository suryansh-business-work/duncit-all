/**
 * Failed Payments: the table's columns (what sorts and filters, how each cell
 * reads), the row tint and the role gate behind every decision button.
 */
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { createTheme } from '@mui/material/styles';
import { fallbackT } from '@duncit/shell';
import { buildFailedPaymentColumns } from '../../src/pages/finance/failed-payments-page/failedPaymentColumns';
import { canManageFailedPayments, failedPaymentRowStyle } from '../../src/pages/finance/failed-payments-page/rowStyle';
import { labelOf, verificationLabels } from '../../src/pages/finance/failed-payments-page/labels';
import { makeFailedPaymentRow } from '../mocks/failed-payments.mock';

const columns = () => buildFailedPaymentColumns(fallbackT, () => <span>actions</span>);
const column = (field: string) => {
  const found = columns().find((c) => c.field === field);
  if (!found) throw new Error(`no column ${field}`);
  return found;
};

describe('buildFailedPaymentColumns', () => {
  it('shows which checkout the money came from, and a dash when the payment is gone', () => {
    const shop = makeFailedPaymentRow({ payment_source: 'POD_SHOP' });
    expect(column('payment_source').valueGetter?.(shop)).toBe('Pod Shop cart');
    expect(column('payment_source').valueGetter?.(makeFailedPaymentRow({ payment_source: 'ECOMM' }))).toBe('Ecomm (pet store)');
    expect(column('payment_source').valueGetter?.(makeFailedPaymentRow({ payment_source: null }))).toBe('—');
    render(<>{column('payment_source').cellRenderer?.(shop)}</>);
    expect(screen.getByText('Pod Shop cart')).toBeInTheDocument();
  });

  it('turns every id in the ids cell into a Payment Trace link, the Duncit ref too', () => {
    const row = makeFailedPaymentRow({ razorpay_refund_id: 'rfnd_9' });
    const { container } = render(<>{column('razorpay_payment_id').cellRenderer?.(row)}</>, { wrapper: MemoryRouter });
    const cell = within(container);
    for (const id of ['pay_RZP123', 'order_RZP9', 'rfnd_9', 'DUN-PAY-9001']) {
      expect(cell.getByRole('link', { name: `Trace ${id}` })).toHaveAttribute('href', `/payment-trace?ref=${id}`);
    }
  });

  it('lets only the server-allowlisted fields sort, and filters the four status enums', () => {
    const sortable = columns().filter((c) => c.type !== 'actions' && c.sortable !== false).map((c) => c.field);
    expect(sortable.sort()).toEqual(['amount', 'attempts', 'created_at', 'updated_at', 'user_name'].sort());
    const enums = columns().filter((c) => c.type === 'enum').map((c) => c.field);
    expect(enums).toEqual(['verification_status', 'review_decision', 'refund_status', 'resolution_state']);
    const verification = column('verification_status');
    expect(verification.type === 'enum' && verification.options.map((o) => o.value)).toEqual([
      'PENDING',
      'MATCHED',
      'UNMATCHED',
      'NOT_CAPTURED',
      'ERROR',
    ]);
  });

  it('reads money, ids, errors and the refund amount off the row', () => {
    const row = makeFailedPaymentRow({ refund_status: 'PROCESSED', refund_amount: 499, review_decision: 'APPROVED' });
    expect(column('amount').valueGetter?.(row)).toBe('₹499.00');
    expect(column('razorpay_payment_id').valueGetter?.(row)).toBe('pay_RZP123 order_RZP9 DUN-PAY-9001');
    expect(column('payment_source').valueGetter?.(row)).toBe('Pod booking');
    expect(column('error_code').valueGetter?.(row)).toBe('BAD_REQUEST_ERROR Payment failed at the bank');
    expect(column('review_decision').valueGetter?.(row)).toBe('Approved');
    expect(column('refund_status').valueGetter?.(row)).toBe('Processed');
    expect(column('ticket_no').valueGetter?.(row)).toBe('ST-AB12CD');
    expect(column('user_name').valueGetter?.(row)).toBe('Riya Sharma +919800000000 riya@duncit.com');

    render(<>{column('refund_status').cellRenderer?.(row)}</>);
    expect(screen.getByText('₹499.00')).toBeInTheDocument();
  });

  it('falls back to dashes and email for a sparse row', () => {
    const row = makeFailedPaymentRow({
      user_phone: null,
      razorpay_payment_id: null,
      razorpay_order_id: null,
      // The Duncit ref is an id too: with it present the cell shows a trace link, not a dash.
      payment_id: '',
      error_code: null,
      error_description: null,
      ticket_no: null,
      pod_title: '',
      review_decision: null,
      created_at: '',
    });
    expect(column('pod_title').valueGetter?.(row)).toBe('—');
    expect(column('ticket_no').valueGetter?.(row)).toBe('—');
    expect(column('review_decision').valueGetter?.(row)).toBe('—');
    expect(column('created_at').valueGetter?.(row)).toBe('—');
    render(
      <>
        {column('user_name').cellRenderer?.(row)}
        {column('razorpay_payment_id').cellRenderer?.(row)}
      </>,
      { wrapper: MemoryRouter },
    );
    expect(screen.getByText('riya@duncit.com')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders status chips and the caller-provided actions', () => {
    const row = makeFailedPaymentRow();
    render(
      <>
        {column('verification_status').cellRenderer?.(row)}
        {column('resolution_state').cellRenderer?.(row)}
        {column('actions').cellRenderer?.(row)}
        {column('razorpay_payment_id').cellRenderer?.(row)}
        {column('error_code').cellRenderer?.(row)}
      </>,
      { wrapper: MemoryRouter },
    );
    expect(screen.getByText('Matched')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('actions')).toBeInTheDocument();
    expect(screen.getByText('order_RZP9')).toBeInTheDocument();
  });
});

describe('labelOf', () => {
  it('names a known value, echoes an unknown one and blanks a missing one', () => {
    const labels = verificationLabels(fallbackT);
    expect(labelOf(labels, 'MATCHED')).toBe('Matched');
    expect(labelOf(labels, 'FUTURE_STATE')).toBe('FUTURE_STATE');
    expect(labelOf(labels, null)).toBe('');
  });
});

describe('failedPaymentRowStyle', () => {
  const theme = createTheme();
  const style = failedPaymentRowStyle(theme);

  it('tints green and yellow rows from the theme palette and leaves the rest alone', () => {
    expect(style({ highlight: 'GREEN' })?.backgroundColor).toContain('rgba');
    expect(style({ highlight: 'YELLOW' })?.backgroundColor).toContain('rgba');
    expect(style({ highlight: 'GREEN' })).not.toEqual(style({ highlight: 'YELLOW' }));
    expect(style({ highlight: 'NONE' })).toBeUndefined();
  });
});

describe('canManageFailedPayments', () => {
  it('allows Finance Managers and Super Admins only', () => {
    expect(canManageFailedPayments(['FINANCE_MANAGER'])).toBe(true);
    expect(canManageFailedPayments(['SUPPORT_USER', 'SUPER_ADMIN'])).toBe(true);
    expect(canManageFailedPayments(['FINANCE_USER'])).toBe(false);
    expect(canManageFailedPayments(null)).toBe(false);
    expect(canManageFailedPayments(undefined)).toBe(false);
  });
});

