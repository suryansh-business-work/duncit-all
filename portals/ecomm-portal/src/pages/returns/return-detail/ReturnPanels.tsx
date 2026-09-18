import { Link as RouterLink } from 'react-router';
import { Link, Stack, Typography } from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import { EM_DASH } from '@duncit/table';
import { ImagePreview, SectionCard } from '@duncit/ui';
import BuyerCell from '../../../components/BuyerCell';
import EventTimeline from '../../../components/EventTimeline';
import InfoRows from '../../../components/InfoRows';
import LineItems from '../../../components/LineItems';
import { money } from '../../../lib/format';
import { codeLabel, REFUND_MODE_KEYS, RETURN_STATUS_KEYS } from '../../../lib/status';
import type { StoreReturn } from '../queries';

interface PanelProps {
  item: StoreReturn;
}

/** What is coming back, and why — the buyer's own words and photos. */
export function ReturnRequestPanel({ item }: Readonly<PanelProps>) {
  const { t } = useTranslation();
  const lines = item.items.map((line) => ({
    key: `${line.product_id}:${line.variant_id}`,
    name: line.name,
    details: [line.variant_label],
    imageUrl: line.image_url,
    qty: line.qty,
    unitPrice: line.unit_price,
  }));
  return (
    <SectionCard title={t('ecommPortal.returns.request')}>
      <LineItems lines={lines} ariaLabel={t('ecommPortal.orders.items')} />
      <Stack spacing={1} sx={{ mt: 2 }}>
        <InfoRows variant="stacked" lines={[{ key: 'reason', label: t('ecommPortal.returns.reason'), value: item.reason }]} />
        <InfoRows variant="stacked" lines={[{ key: 'comments', label: t('ecommPortal.returns.comments'), value: item.comments || EM_DASH }]} />
        {item.images.length > 0 && (
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            {item.images.map((src, index) => (
              <ImagePreview key={src} src={src} label={t('ecommPortal.returns.photoN', { vars: { n: index + 1 } })} />
            ))}
          </Stack>
        )}
      </Stack>
    </SectionCard>
  );
}

/** Every step the return has taken, newest first, with who took it. */
export function ReturnHistoryPanel({ item }: Readonly<PanelProps>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const events = [...item.events].reverse().map((event) => ({
    key: event.status + '@' + event.at,
    title: codeLabel(RETURN_STATUS_KEYS, event.status, t),
    note: event.note,
    meta: [event.by, formatDateTime(event.at)].filter(Boolean).join(' · '),
  }));
  return (
    <SectionCard title={t('ecommPortal.returns.history')}>
      <EventTimeline events={events} ariaLabel={t('ecommPortal.returns.history')} />
    </SectionCard>
  );
}

/** Who is returning, against which order, and where the refund stands. */
export function ReturnSummaryPanel({ item }: Readonly<PanelProps>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  return (
    <SectionCard title={t('ecommPortal.returns.summary')}>
      <Stack spacing={1.5}>
        <BuyerCell name={item.buyer_name} email={item.buyer_email} guest={item.is_guest} />
        <Link component={RouterLink} to={`/orders/${item.order_id}`} variant="body2">
          {t('ecommPortal.returns.viewOrder', { vars: { order: item.order_no } })}
        </Link>
        <InfoRows
          lines={[
            { key: 'amount', label: t('ecommPortal.returns.refund'), value: money(item.refund_amount), bold: true },
            { key: 'mode', label: t('ecommPortal.returns.refundMode'), value: codeLabel(REFUND_MODE_KEYS, item.refund_mode, t) },
            { key: 'refundedAt', label: t('ecommPortal.returns.refundedAt'), value: item.refunded_at ? formatDateTime(item.refunded_at) : EM_DASH },
            { key: 'restocked', label: t('ecommPortal.returns.restocked'), value: item.restocked ? t('shell.common.yes') : t('shell.common.no') },
          ]}
        />
        {item.admin_note && (
          <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-line' }}>
            {item.admin_note}
          </Typography>
        )}
      </Stack>
    </SectionCard>
  );
}
