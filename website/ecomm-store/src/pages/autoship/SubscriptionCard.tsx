import { useState } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Box, Chip, Stack, Typography } from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { useDateFormat } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';

import { StoreImage } from '../../components/StoreImage';
import type { StoreSubscription } from '../../graphql/autoship';
import { useMoney } from '../../lib/money';
import { useStoreT } from '../../i18n';
import { STORE_TOKENS as T, tintAt } from '../../theme/tokens';
import { AutoshipEditDialog } from './autoship-edit-form';
import { useSubscriptionActions } from './useSubscriptionActions';

const STATUS_KEYS = {
  ACTIVE: 'ecommStore.autoship.status.active',
  PAUSED: 'ecommStore.autoship.status.paused',
  CANCELLED: 'ecommStore.autoship.status.cancelled',
} as const;

/** One Autoship: the product, how many, how often, when next, and what can be done. */
export function SubscriptionCard({ subscription, position }: Readonly<{ subscription: StoreSubscription; position: number }>) {
  const { t } = useStoreT();
  const money = useMoney();
  const { formatDate, formatDateTime } = useDateFormat();
  const [editing, setEditing] = useState(false);
  const actions = useSubscriptionActions(subscription);
  const live = subscription.status !== 'CANCELLED';
  const title = subscription.product?.title ?? subscription.variant_label;
  return (
    <Stack component="li" spacing={1.5} sx={{ listStyle: 'none', bgcolor: tintAt(position), borderRadius: `${T.radius.card}px`, p: 2 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <Box sx={{ width: 72, flexShrink: 0, bgcolor: T.surface, borderRadius: `${T.radius.panel}px`, overflow: 'hidden' }}>
          <StoreImage src={subscription.product?.image_url ?? ''} alt="" width={72} height={72} sx={{ objectFit: 'contain' }} />
        </Box>
        <Stack sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800 }}>{title}</Typography>
          <Typography variant="body2">
            {t('ecommStore.autoship.summary', { vars: { qty: subscription.qty, weeks: subscription.frequency_weeks, price: money(subscription.unit_price) } })}
          </Typography>
          {subscription.next_run_at && subscription.status === 'ACTIVE' ? (
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {t('ecommStore.autoship.next', { vars: { date: formatDate(subscription.next_run_at) } })}
            </Typography>
          ) : null}
        </Stack>
        <Chip size="small" label={t(STATUS_KEYS[subscription.status])} sx={{ bgcolor: T.surface }} />
      </Stack>
      <Typography variant="caption" color="text.secondary">
        {subscription.mode === 'COD_AUTO' ? t('ecommStore.autoship.modeCod') : t('ecommStore.autoship.modeRemind')}
      </Typography>
      {live ? (
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          <DuncitButton size="small" variant="outlined" onClick={() => setEditing(true)} sx={{ bgcolor: T.surface }}>
            {t('ecommStore.autoship.edit')}
          </DuncitButton>
          <DuncitButton size="small" variant="outlined" onClick={actions.togglePause} sx={{ bgcolor: T.surface }}>
            {subscription.status === 'ACTIVE' ? t('ecommStore.autoship.pause') : t('ecommStore.autoship.resume')}
          </DuncitButton>
          <DuncitButton size="small" variant="outlined" onClick={actions.skipNext} disabled={subscription.status !== 'ACTIVE'} sx={{ bgcolor: T.surface }}>
            {t('ecommStore.autoship.skip')}
          </DuncitButton>
          <DuncitButton size="small" variant="contained" onClick={actions.orderNow}>
            {t('ecommStore.autoship.orderNow')}
          </DuncitButton>
          <DuncitButton size="small" color="error" onClick={actions.cancelPlan}>
            {t('ecommStore.autoship.cancel')}
          </DuncitButton>
        </Stack>
      ) : null}
      {subscription.events.length > 0 ? (
        <Accordion disableGutters sx={{ bgcolor: T.surface, borderRadius: `${T.radius.panel}px !important`, '&::before': { display: 'none' } }}>
          <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {t('ecommStore.autoship.history')}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack component="ul" spacing={0.5} sx={{ p: 0, m: 0, listStyle: 'none' }}>
              {subscription.events.map((event) => (
                <Typography component="li" key={`${event.at}:${event.action}`} variant="body2">
                  {[formatDateTime(event.at), event.action, event.note].filter(Boolean).join(' · ')}
                </Typography>
              ))}
            </Stack>
          </AccordionDetails>
        </Accordion>
      ) : null}
      {editing ? <AutoshipEditDialog subscription={subscription} onClose={() => setEditing(false)} /> : null}
    </Stack>
  );
}
