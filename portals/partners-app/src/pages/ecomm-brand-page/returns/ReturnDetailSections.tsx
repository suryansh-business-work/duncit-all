import type { ReactNode } from 'react';
import { Alert, Avatar, List, ListItem, ListItemAvatar, ListItemText, Stack, Typography } from '@mui/material';
import { formatDateTime } from '@duncit/app-settings';
import { formatMoney } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import { pickupStateLabel, refundStatusLabel, returnStatusLabel } from './return-labels';
import type { ReturnRow } from './returns.queries';

export function DetailSection({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <Stack component="section" spacing={0.75}>
      <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 800 }}>
        {title}
      </Typography>
      {children}
    </Stack>
  );
}

/** One "label: value" line; nothing when the value is blank. */
function Fact({ label, value }: Readonly<{ label: string; value: string | number }>) {
  if (value === '') return null;
  return (
    <Typography variant="body2">
      <Typography component="span" variant="body2" sx={{ color: 'text.secondary' }}>
        {label}:{' '}
      </Typography>
      {value}
    </Typography>
  );
}

export function ReturnItems({ row }: Readonly<{ row: ReturnRow }>) {
  const { t } = useTranslation();
  return (
    <DetailSection title={t('partners.returns.itemsHeading')}>
      <List dense disablePadding aria-label={t('partners.returns.itemsHeading')}>
        {row.items.map((item) => (
          <ListItem key={`${item.product_id}-${item.variant_id}`} disableGutters>
            <ListItemAvatar>
              <Avatar variant="rounded" src={item.image_url || undefined} alt={item.name} />
            </ListItemAvatar>
            <ListItemText
              primary={item.variant_label ? `${item.name} · ${item.variant_label}` : item.name}
              secondary={t('partners.returns.itemQtyPrice', { vars: { qty: item.qty, price: formatMoney(item.unit_cost, { decimals: 2 }) } })}
            />
          </ListItem>
        ))}
      </List>
    </DetailSection>
  );
}

export function ReturnReason({ row }: Readonly<{ row: ReturnRow }>) {
  const { t } = useTranslation();
  return (
    <DetailSection title={t('partners.returns.reasonHeading')}>
      <Typography variant="body2">{row.reason}</Typography>
      <Fact label={t('partners.returns.buyerComments')} value={row.comments} />
      <Fact label={t('partners.returns.decisionNote')} value={row.decision_note} />
    </DetailSection>
  );
}

export function ReturnPickup({ row }: Readonly<{ row: ReturnRow }>) {
  const { t } = useTranslation();
  const { pickup } = row;
  return (
    <DetailSection title={t('partners.returns.pickupHeading')}>
      <Fact label={t('shell.common.status')} value={pickupStateLabel(t, pickup.status)} />
      <Fact label={t('partners.returns.awb')} value={pickup.awb} />
      <Fact label={t('partners.returns.courier')} value={pickup.courier_name} />
      <Fact label={t('partners.returns.tracking')} value={pickup.tracking_status} />
      {pickup.last_error && (
        <Alert severity="error">{t('partners.returns.pickupError', { vars: { error: pickup.last_error } })}</Alert>
      )}
    </DetailSection>
  );
}

export function ReturnRefund({ row }: Readonly<{ row: ReturnRow }>) {
  const { t } = useTranslation();
  const { refund } = row;
  return (
    <DetailSection title={t('partners.returns.refundHeading')}>
      <Fact label={t('shell.common.status')} value={refundStatusLabel(t, refund.status)} />
      {refund.status !== 'NONE' && <Fact label={t('partners.returns.refundAmount')} value={formatMoney(refund.amount, { decimals: 2 })} />}
      {refund.coins > 0 && <Fact label={t('partners.returns.refundCoins')} value={refund.coins} />}
      {refund.status === 'FAILED' && refund.error && <Alert severity="error">{refund.error}</Alert>}
    </DetailSection>
  );
}

export function ReturnTimeline({ row }: Readonly<{ row: ReturnRow }>) {
  const { t } = useTranslation();
  return (
    <DetailSection title={t('partners.returns.historyHeading')}>
      <List dense disablePadding aria-label={t('partners.returns.historyHeading')}>
        {row.events.map((event) => (
          <ListItem key={`${event.status}-${event.at}`} disableGutters divider>
            <ListItemText
              primary={`${returnStatusLabel(t, event.status)} · ${formatDateTime(event.at)}`}
              secondary={[event.note, event.by].filter(Boolean).join(' — ')}
            />
          </ListItem>
        ))}
      </List>
    </DetailSection>
  );
}
