import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Chip, Stack, TextField } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutlined';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { QueryGuard, useDebouncedValue } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import type { LiteEvent, LiteRegistration, LiteRegistrationStatus } from '../../../../shared/graphql/documents';
import { useWebT } from '../../../../shared/i18n';
import { EmptyState } from '../../../components/EmptyState';
import { LITE_EVENT_REGISTRATIONS, LITE_HOST_REGISTRATION_ACTION } from '../../../graphql/manage';
import type { LiteRegistrationAction } from '../../../graphql/types';
import { exportGuestsCsv } from './exportCsv';
import { GuestsTable } from './GuestsTable';
import { DESTRUCTIVE_ACTIONS } from './rowActions';

const STATUSES: LiteRegistrationStatus[] = ['PENDING_APPROVAL', 'PAYMENT_PENDING', 'CONFIRMED', 'WAITLISTED', 'DECLINED', 'CANCELLED'];

/** Everyone who registered: filter by status, search by name, act on each, or export the lot. */
export function GuestsTab({ event, onChanged }: Readonly<{ event: LiteEvent; onChanged: () => void }>) {
  const { t } = useWebT();
  const confirm = useConfirm();
  const [status, setStatus] = useState<LiteRegistrationStatus | null>(null);
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search.trim(), 300);
  const { data, loading, error, refetch } = useQuery(LITE_EVENT_REGISTRATIONS, {
    variables: { event_id: event.id, status, search: debounced || null },
    fetchPolicy: 'cache-and-network',
  });
  const [runAction] = useMutation(LITE_HOST_REGISTRATION_ACTION);
  const guests = data?.liteEventRegistrations ?? [];

  const act = async (guest: LiteRegistration, action: LiteRegistrationAction) => {
    if (DESTRUCTIVE_ACTIONS.has(action)) {
      const ok = await confirm({
        title: t(`liteWeb.manage.guests.actions.${action}`),
        message: t('liteWeb.manage.guests.confirmBody', { vars: { name: guest.user.name } }),
        confirmLabel: t(`liteWeb.manage.guests.actions.${action}`),
        destructive: true,
      });
      if (!ok) return;
    }
    try {
      await runAction({ variables: { id: guest.id, action } });
      notifySuccess(t('liteWeb.manage.guests.actionDone', { vars: { name: guest.user.name } }));
      await refetch();
      onChanged();
    } catch (err) {
      notifyError(parseApiError(err));
    }
  };

  return (
    <Stack spacing={2} data-testid="manage-guests">
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' } }}>
        <TextField
          size="small"
          type="search"
          label={t('liteWeb.manage.guests.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flexGrow: 1 }}
          slotProps={{ htmlInput: { 'data-testid': 'guests-search' } }}
        />
        <DuncitButton variant="outlined" startIcon={<DownloadIcon />} onClick={() => exportGuestsCsv(guests, event.slug, t)} disabled={guests.length === 0} data-testid="guests-export">
          {t('liteWeb.manage.guests.export')}
        </DuncitButton>
      </Stack>
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }} role="group" aria-label={t('liteWeb.manage.guests.filterLabel')}>
        <Chip label={t('liteWeb.manage.guests.all')} color={status === null ? 'primary' : 'default'} onClick={() => setStatus(null)} data-testid="guests-filter-all" />
        {STATUSES.map((value) => (
          <Chip key={value} label={t(`lite.status.${value}`)} color={status === value ? 'primary' : 'default'} onClick={() => setStatus(value)} data-testid={`guests-filter-${value}`} />
        ))}
      </Stack>
      <QueryGuard loading={loading && !data} error={error} loadingLabel={t('lite.common.loading')}>
        {guests.length === 0 ? (
          <EmptyState icon={<PeopleOutlineIcon />} title={t('liteWeb.manage.guests.empty')} body={t('liteWeb.manage.guests.emptyBody')} />
        ) : (
          <GuestsTable guests={guests} onAction={act} />
        )}
      </QueryGuard>
    </Stack>
  );
}
