import { Chip } from '@mui/material';
import type { DuncitColumn } from '@duncit/table';
import type { WebhookDelivery, WebhookDeliveryStatus } from './webhooks.queries';

type Translate = (key: string, options?: { vars?: Record<string, string | number> }) => string;

/** Keys written out in full, so the translation gate sees each one. */
const STATUS: Record<WebhookDeliveryStatus, { label: string; color: 'default' | 'info' | 'success' | 'error' }> = {
  RECEIVED: { label: 'marketing.socialWebhooks.statusReceived', color: 'default' },
  PROCESSING: { label: 'marketing.socialWebhooks.statusProcessing', color: 'info' },
  PROCESSED: { label: 'marketing.socialWebhooks.statusProcessed', color: 'success' },
  FAILED: { label: 'marketing.socialWebhooks.statusFailed', color: 'error' },
};

/** "2 stored · 1 duplicate · …" — what the delivery's events came to. */
export const outcomeText = (t: Translate, outcome: WebhookDelivery['outcome']): string => t('marketing.socialWebhooks.outcomeSummary', { vars: { ...outcome } });

/** The delivery list: when, what, which accounts, how it went and what became of each event. */
export function deliveryColumns(t: Translate, formatDateTime: (value: string) => string): Array<DuncitColumn<WebhookDelivery>> {
  return [
    {
      field: 'received_at',
      headerName: t('marketing.socialWebhooks.colReceived'),
      type: 'date',
      width: 190,
      valueGetter: (row) => formatDateTime(row.received_at),
    },
    { field: 'object', headerName: t('marketing.socialWebhooks.colObject'), type: 'text', width: 120 },
    {
      field: 'entry_ids',
      headerName: t('marketing.socialWebhooks.colAccounts'),
      type: 'text',
      width: 200,
      valueGetter: (row) => row.entry_ids.join(', '),
    },
    {
      field: 'fields',
      headerName: t('marketing.socialWebhooks.colFields'),
      type: 'text',
      width: 160,
      valueGetter: (row) => row.fields.join(', '),
    },
    {
      field: 'status',
      headerName: t('marketing.socialWebhooks.colStatus'),
      type: 'text',
      width: 130,
      valueGetter: (row) => t(STATUS[row.status].label),
      cellRenderer: (row) => <Chip size="small" color={STATUS[row.status].color} label={t(STATUS[row.status].label)} />,
    },
    {
      field: 'outcome',
      headerName: t('marketing.socialWebhooks.colOutcome'),
      type: 'text',
      flex: 1,
      minWidth: 280,
      valueGetter: (row) => outcomeText(t, row.outcome),
    },
    { field: 'attempts', headerName: t('marketing.socialWebhooks.colAttempts'), type: 'number', width: 110 },
    { field: 'error', headerName: t('marketing.socialWebhooks.colError'), type: 'text', width: 240 },
  ];
}
