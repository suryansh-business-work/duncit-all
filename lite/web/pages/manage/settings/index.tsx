import { useState } from 'react';
import { Link as RouterLink } from 'react-router';
import { Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { SectionCard } from '@duncit/ui';
import type { LiteEvent } from '../../../../shared/graphql/documents';
import { useWebT } from '../../../../shared/i18n';
import { CopyField } from '../../../components/CopyField';
import { eventIcsUrl, eventUrl } from '../../../lib/calendarLinks';
import { paths } from '../../../lib/paths';
import { CancelEventDialog } from '../cancel-event';
import { CoHostForm } from './co-host-form';
import { CoHostList } from './CoHostList';

/** Links, co-hosts, and the door out. */
export function SettingsTab({ event, onChanged }: Readonly<{ event: LiteEvent; onChanged: () => void }>) {
  const { t } = useWebT();
  const [cancelOpen, setCancelOpen] = useState(false);
  const live = event.status !== 'CANCELLED';
  return (
    <Stack spacing={3} data-testid="manage-settings">
      <SectionCard
        title={t('liteWeb.manage.settings.details')}
        action={
          live ? (
            <DuncitButton component={RouterLink} to={paths.eventEdit(event.slug)} variant="outlined" size="small" data-testid="settings-edit">
              {t('liteWeb.manage.editEvent')}
            </DuncitButton>
          ) : undefined
        }
      >
        <Stack spacing={2}>
          <CopyField label={t('liteWeb.manage.settings.eventLink')} value={eventUrl(event.slug)} testId="settings-event-link" />
          <CopyField label={t('liteWeb.manage.settings.icsLink')} value={eventIcsUrl(event.slug)} testId="settings-ics-link" />
        </Stack>
      </SectionCard>
      <SectionCard title={t('liteWeb.manage.settings.coHosts')} subtitle={t('liteWeb.manage.settings.coHostsHint')}>
        <Stack spacing={2}>
          <CoHostList event={event} onChanged={onChanged} />
          {live ? <CoHostForm eventId={event.id} onAdded={onChanged} /> : null}
        </Stack>
      </SectionCard>
      {live ? (
        <SectionCard title={t('liteWeb.manage.cancel.title')} subtitle={t('liteWeb.manage.cancel.warning')}>
          <DuncitButton variant="outlined" color="error" onClick={() => setCancelOpen(true)} data-testid="settings-cancel">
            {t('liteWeb.manage.cancel.title')}
          </DuncitButton>
        </SectionCard>
      ) : (
        <Typography color="text.secondary" data-testid="settings-cancelled">
          {t('liteWeb.event.closed.cancelled')}
        </Typography>
      )}
      <CancelEventDialog eventId={event.id} open={cancelOpen} onClose={() => setCancelOpen(false)} onCancelled={onChanged} />
    </Stack>
  );
}
