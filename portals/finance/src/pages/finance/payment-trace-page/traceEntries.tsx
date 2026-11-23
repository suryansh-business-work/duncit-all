import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';
import { Link } from '@mui/material';
import type { DateFormatter, Translator } from '@duncit/app-settings';
import { EM_DASH } from '@duncit/table';
import { fmt } from '../payment-logs-page/helpers';
import TraceLink, { tracedId } from '../../../components/TraceLink';
import { isTraceableId } from '../../../lib/paymentTrace';
import type { PaymentTrace } from './queries';
import type { TraceEntry } from './TraceSection';

type T = Translator['t'];
type Fmt = DateFormatter['formatDateTime'];

/**
 * Each log of a trace as entries for TraceSection. Every id in an entry is a
 * trace link, so one id leads to the next; the payment each entry belongs to
 * is named by its Duncit ref. Builders only — no state.
 */

const when = (iso: string | null | undefined, format: Fmt) => (iso ? format(iso) : EM_DASH);
/** Logs that carry no currency of their own print the traced payment's. */
const symbolOf = (trace: PaymentTrace) => trace.payments[0]?.currency_symbol ?? '';
const money = (amount: number | null | undefined, symbol: string) => (amount == null ? null : fmt(amount, symbol));
const present = (lines: { label: string; value: ReactNode }[]) => lines.filter((l) => l.value !== null && l.value !== undefined && l.value !== '');

export const stepEntries = (t: T, trace: PaymentTrace, format: Fmt): TraceEntry[] =>
  trace.steps.map((s, i) => ({
    key: `${s.payment_id}:${s.key}:${i}`,
    title: s.key,
    chips: [s.status],
    when: when(s.at, format),
    lines: present([
      { label: t('finance.payment.idDuncitRef'), value: tracedId(s.payment_id) },
      { label: t('finance.paymentTrace.detail'), value: s.detail },
    ]),
  }));

export const eventEntries = (t: T, trace: PaymentTrace, format: Fmt): TraceEntry[] =>
  trace.events.map((e) => ({
    key: e.id,
    title: e.type,
    chips: [e.source, e.actor_name ?? ''],
    when: when(e.created_at, format),
    lines: present([
      { label: t('finance.payment.idDuncitRef'), value: tracedId(e.payment_id) },
      ...e.details.map((d) => ({ label: d.key, value: isTraceableId(d.value) ? <TraceLink value={d.value} /> : d.value })),
    ]),
  }));

export const webhookEntries = (t: T, trace: PaymentTrace, format: Fmt): TraceEntry[] =>
  trace.webhooks.map((w) => ({
    key: w.id,
    title: w.event,
    chips: [w.status ?? '', w.outcome ?? ''],
    when: when(w.received_at, format),
    lines: present([
      { label: t('finance.payment.idRazorpayPayment'), value: tracedId(w.razorpay_payment_id) },
      { label: t('finance.payment.idRazorpayOrder'), value: tracedId(w.razorpay_order_id) },
      { label: t('finance.payment.idRazorpayRefund'), value: tracedId(w.razorpay_refund_id) },
      { label: t('finance.paymentTrace.amount'), value: money(w.amount, symbolOf(trace)) },
      { label: t('finance.paymentTrace.error'), value: w.error },
    ]),
  }));

export const caseEntries = (t: T, trace: PaymentTrace, format: Fmt): TraceEntry[] =>
  trace.failed_cases.map((c) => ({
    key: c.id,
    title: (
      <Link component={RouterLink} to={`/failed-payments/${encodeURIComponent(c.id)}`}>
        {t('finance.paymentTrace.openCase')}
      </Link>
    ),
    chips: [c.verification_status, c.resolution_state],
    when: when(c.created_at, format),
    lines: present([
      { label: t('finance.payment.idDuncitRef'), value: tracedId(c.payment_id) },
      { label: t('finance.paymentTrace.refundStatus'), value: c.refund_status },
    ]),
  }));

export const refundEntries = (t: T, trace: PaymentTrace, format: Fmt): TraceEntry[] =>
  trace.gateway_refunds.map((r) => ({
    key: r.id,
    title: r.razorpay_refund_id ? <TraceLink value={r.razorpay_refund_id} variant="body2" /> : r.source,
    chips: [r.source, r.status],
    when: when(r.created_at, format),
    lines: present([
      { label: t('finance.payment.idDuncitRef'), value: tracedId(r.payment_id) },
      { label: t('finance.payment.idRazorpayPayment'), value: tracedId(r.razorpay_payment_id) },
      { label: t('finance.paymentTrace.amount'), value: money(r.amount, symbolOf(trace)) },
      { label: t('finance.paymentTrace.reason'), value: r.reason },
      { label: t('finance.paymentTrace.error'), value: r.last_error },
      { label: t('finance.paymentTrace.processedAt'), value: r.processed_at ? format(r.processed_at) : null },
    ]),
  }));

export const shopOrderEntries = (t: T, trace: PaymentTrace, format: Fmt): TraceEntry[] =>
  trace.shop_orders.map((o) => ({
    key: o.id,
    title: o.order_no,
    chips: [o.channel, o.fulfilment_status],
    when: when(o.created_at, format),
    lines: present([
      { label: t('finance.payment.idDuncitRef'), value: tracedId(o.payment_id) },
      { label: t('finance.paymentTrace.amount'), value: money(o.total, symbolOf(trace)) },
      { label: t('finance.paymentTrace.refundStatus'), value: o.refund_status },
    ]),
  }));

export const foodOrderEntries = (t: T, trace: PaymentTrace, format: Fmt): TraceEntry[] =>
  trace.food_orders.map((o) => ({
    key: o.id,
    title: o.order_no,
    chips: [o.status, o.payment_status],
    when: when(o.created_at, format),
    lines: present([
      { label: t('finance.paymentTrace.venue'), value: o.venue_name },
      { label: t('finance.paymentTrace.amount'), value: fmt(o.amount, o.currency_symbol) },
      { label: t('finance.payment.idRazorpayPayment'), value: tracedId(o.razorpay_payment_id) },
      { label: t('finance.payment.idRazorpayOrder'), value: tracedId(o.razorpay_order_id) },
      { label: t('finance.payment.idRazorpayRefund'), value: tracedId(o.razorpay_refund_id) },
    ]),
  }));
