import {
  allZero,
  buildOrderTimeline,
  fulfilmentFlow,
  fulfilmentLabel,
  isTerminalFulfilment,
  statusLabel,
  trackingUrl,
  buildEarningsBars,
  buildParticipantTrend,
  buildPodsOverTime,
  buildStatusSlices,
  hostRangeMeta,
} from '@duncit/utils';
import { defineDemo, type PackageDemo } from '../../types';
import type { OrderMock, HostInsightsMock } from './mocks';

export const insightsAndOrdersDemos: PackageDemo[] = [
  defineDemo<HostInsightsMock>({
    id: 'host-insights',
    title: 'The Host Studio charts, as numbers',
    note: 'Change range to ALL and the series starts at the host’s first pod instead of six months back — with an empty pod list it returns nothing at all, which is what makes the screen show its empty state rather than an axis of zeroes. The donut colours come from the palette below, never from inside the package.',
    mock: {
      range: 'PAST_6_MONTHS',
      podDates: [
        '2026-08-14T12:30:00.000Z',
        '2026-08-02T09:00:00.000Z',
        '2026-06-21T15:00:00.000Z',
        '2026-04-09T06:30:00.000Z',
      ],
      pods: [
        {
          pod_date_time: '2026-08-14T12:30:00.000Z',
          pod_attendees: ['u1', 'u2', 'u3', 'u4', 'u5'],
          pod_hosts_id: ['host-1'],
        },
        {
          pod_date_time: '2026-06-21T15:00:00.000Z',
          pod_attendees: ['u1', 'u2'],
          pod_hosts_id: ['host-1'],
        },
      ],
      statusCounts: { upcoming: 3, ongoing: 1, completed: 8, cancelled: 2 },
      earnings: [
        { month: '2026-06', total: 3400 },
        { month: '2026-07', total: 5125 },
        { month: '2026-08', total: 4200 },
      ],
      palette: { warning: '#f59e0b', success: '#22c55e', info: '#3b82f6', error: '#ef4444' },
    },
    compute: (mock) => {
      const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
        Object.entries(options?.vars ?? {}).reduce<string>(
          (acc, [name, value]) => acc.replaceAll(`{${name}}`, String(value)),
          key,
        );
      const podsByMonth = buildPodsOverTime(mock.podDates, mock.range);
      return {
        Heading: hostRangeMeta(mock.range, t),
        'Pods by month': podsByMonth,
        'Guests per pod (seats minus hosts)': buildParticipantTrend(mock.pods),
        'Status donut': buildStatusSlices(mock.statusCounts, mock.palette, t),
        'Earnings bars': buildEarningsBars(mock.earnings),
        'Chart is empty': allZero(podsByMonth),
        'Why seats, not people':
          'This sits beside the money the host is shown, and the settlement it has to agree with is priced per seat.',
      };
    },
  }),

  defineDemo<OrderMock>({
    id: 'product-orders',
    title: 'Where a product order actually is',
    note: 'Set fulfilment_method to PICKUP and fulfilment_status to PICKUP_SCHEDULED — the buyer now sees that rung. Their old ladder had no such step, so this order read back to them as "Order placed" while the seller had already scheduled it. Try CANCELLED and the whole ladder collapses to one step.',
    mock: {
      fulfilment_method: 'SHIP',
      fulfilment_status: 'AWB_ASSIGNED',
      awb: 'SR784512396',
    },
    compute: (mock) => {
      const t = (key: string) => key;
      const order = {
        fulfilment_method: mock.fulfilment_method,
        fulfilment_status: mock.fulfilment_status,
      };
      return {
        'Reads as': statusLabel(mock.fulfilment_status, t),
        'Fulfilled by': fulfilmentLabel(mock.fulfilment_method, t),
        'The flow for this method': fulfilmentFlow(mock.fulfilment_method),
        Timeline: buildOrderTimeline(order, t),
        'Order has stopped moving': isTerminalFulfilment(mock.fulfilment_status),
        'Track it at': trackingUrl(mock.awb) || '(no AWB yet — the caller shows no link)',
        'An unknown status': statusLabel('AWAITING_QUANTUM_TUNNEL', t),
      };
    },
  }),
];
