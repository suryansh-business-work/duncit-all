import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router';
import { useMutation } from '@apollo/client/react';
import { Box, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { SectionCard, StatCard } from '@duncit/ui';
import { formatMoney, parseApiError } from '@duncit/utils';
import type { LiteEvent } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';
import { LITE_DUPLICATE_EVENT, LITE_MY_EVENTS, LITE_PUBLISH_EVENT } from '../../graphql/events';
import { paths } from '../../lib/paths';
import { CancelEventDialog } from './cancel-event';

interface OverviewTabProps {
  event: LiteEvent;
  onChanged: () => void;
  onOpenTab: (tab: 'guests' | 'checkin') => void;
}

const TILE_KEYS = ['going', 'pending', 'payment_pending', 'waitlisted', 'checked_in'] as const;

/** The numbers, the quick links and the three big actions: publish, duplicate, cancel. */
export function OverviewTab({ event, onChanged, onOpenTab }: Readonly<OverviewTabProps>) {
  const { t } = useWebT();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [publishEvent, publishState] = useMutation(LITE_PUBLISH_EVENT);
  const [duplicateEvent, duplicateState] = useMutation(LITE_DUPLICATE_EVENT, { refetchQueries: [LITE_MY_EVENTS] });

  const publish = async () => {
    const ok = await confirm({ title: t('liteWeb.event.publishConfirmTitle'), message: t('liteWeb.event.publishConfirmBody'), confirmLabel: t('liteWeb.event.publish') });
    if (!ok) return;
    try {
      await publishEvent({ variables: { id: event.id } });
      notifySuccess(t('liteWeb.event.published'));
      onChanged();
    } catch (error) {
      notifyError(parseApiError(error));
    }
  };

  const duplicate = async () => {
    const ok = await confirm({ title: t('liteWeb.manage.duplicateTitle'), message: t('liteWeb.manage.duplicateBody'), confirmLabel: t('liteWeb.manage.duplicate') });
    if (!ok) return;
    try {
      const { data } = await duplicateEvent({ variables: { id: event.id } });
      const copy = data?.liteDuplicateEvent;
      notifySuccess(t('liteWeb.manage.duplicated'));
      if (copy) navigate(paths.eventEdit(copy.slug));
    } catch (error) {
      notifyError(parseApiError(error));
    }
  };

  const live = event.status !== 'CANCELLED';
  return (
    <Stack spacing={3} data-testid="manage-overview">
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' } }}>
        {TILE_KEYS.map((key) => (
          <StatCard key={key} label={t(`liteWeb.manage.stats.${key}`)} value={event.stats[key]} testId={`stat-${key}`} />
        ))}
        <StatCard label={t('liteWeb.manage.stats.revenue_confirmed')} value={formatMoney(event.stats.revenue_confirmed)} testId="stat-revenue" />
      </Box>
      <SectionCard title={t('liteWeb.manage.quickLinks')}>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          <DuncitButton component={RouterLink} to={paths.event(event.slug)} variant="outlined" data-testid="overview-view">
            {t('liteWeb.manage.viewPage')}
          </DuncitButton>
          {live ? (
            <DuncitButton component={RouterLink} to={paths.eventEdit(event.slug)} variant="outlined" data-testid="overview-edit">
              {t('liteWeb.manage.editEvent')}
            </DuncitButton>
          ) : null}
          <DuncitButton variant="outlined" onClick={() => onOpenTab('guests')} data-testid="overview-guests">
            {t('liteWeb.manage.tabs.guests')}
          </DuncitButton>
          <DuncitButton variant="outlined" onClick={() => onOpenTab('checkin')} data-testid="overview-checkin">
            {t('liteWeb.manage.tabs.checkin')}
          </DuncitButton>
        </Stack>
      </SectionCard>
      <SectionCard title={t('liteWeb.manage.actions')}>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          {event.status === 'DRAFT' ? (
            <DuncitButton variant="contained" onClick={publish} loading={publishState.loading} data-testid="overview-publish">
              {t('liteWeb.event.publish')}
            </DuncitButton>
          ) : null}
          <DuncitButton variant="outlined" onClick={duplicate} loading={duplicateState.loading} data-testid="overview-duplicate">
            {t('liteWeb.manage.duplicate')}
          </DuncitButton>
          {live ? (
            <DuncitButton variant="outlined" color="error" onClick={() => setCancelOpen(true)} data-testid="overview-cancel">
              {t('liteWeb.manage.cancel.title')}
            </DuncitButton>
          ) : null}
        </Stack>
      </SectionCard>
      <CancelEventDialog eventId={event.id} open={cancelOpen} onClose={() => setCancelOpen(false)} onCancelled={onChanged} />
    </Stack>
  );
}
