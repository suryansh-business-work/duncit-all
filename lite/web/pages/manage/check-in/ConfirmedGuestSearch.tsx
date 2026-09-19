import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { List, ListItem, ListItemText, Stack, TextField, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { QueryGuard, useDebouncedValue } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import type { LiteRegistration } from '../../../../shared/graphql/documents';
import { useWebT } from '../../../../shared/i18n';
import { LITE_EVENT_REGISTRATIONS, LITE_HOST_REGISTRATION_ACTION } from '../../../graphql/manage';

interface ConfirmedGuestSearchProps {
  eventId: string;
  onCheckedIn: (registration: LiteRegistration) => void;
}

/** For the guest who cannot find their code: search the confirmed list by name and check them in from it. */
export function ConfirmedGuestSearch({ eventId, onCheckedIn }: Readonly<ConfirmedGuestSearchProps>) {
  const { t } = useWebT();
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search.trim(), 300);
  const { data, loading, error, refetch } = useQuery(LITE_EVENT_REGISTRATIONS, {
    variables: { event_id: eventId, status: 'CONFIRMED', search: debounced || null },
    fetchPolicy: 'cache-and-network',
  });
  const [runAction] = useMutation(LITE_HOST_REGISTRATION_ACTION);
  const guests = data?.liteEventRegistrations ?? [];

  const checkIn = async (guest: LiteRegistration) => {
    try {
      const { data: result } = await runAction({ variables: { id: guest.id, action: 'CHECK_IN' } });
      if (result?.liteHostRegistrationAction) onCheckedIn(result.liteHostRegistrationAction);
      notifySuccess(t('liteWeb.manage.checkIn.done', { vars: { name: guest.user.name } }));
      await refetch();
    } catch (err) {
      notifyError(parseApiError(err));
    }
  };

  return (
    <Stack spacing={1.5} data-testid="confirmed-guest-search">
      <TextField
        size="small"
        type="search"
        label={t('liteWeb.manage.checkIn.searchLabel')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        slotProps={{ htmlInput: { 'data-testid': 'check-in-search' } }}
      />
      <QueryGuard loading={loading && !data} error={error} loadingLabel={t('lite.common.loading')}>
        {guests.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t('liteWeb.manage.checkIn.noneFound')}
          </Typography>
        ) : (
          <List dense disablePadding sx={{ border: 1, borderColor: 'divider', borderRadius: 3, bgcolor: 'background.paper' }}>
            {guests.map((guest) => (
              <ListItem
                key={guest.id}
                divider
                secondaryAction={
                  guest.checked_in_at ? (
                    <Typography variant="body2" color="success.main" sx={{ fontWeight: 700 }}>
                      {t('liteWeb.manage.checkIn.already')}
                    </Typography>
                  ) : (
                    <DuncitButton size="small" variant="contained" onClick={() => checkIn(guest)} data-testid={`check-in-guest-${guest.id}`}>
                      {t('liteWeb.manage.guests.actions.CHECK_IN')}
                    </DuncitButton>
                  )
                }
              >
                <ListItemText primary={guest.user.name} secondary={`${guest.ticket.name} × ${guest.quantity} · ${guest.code}`} />
              </ListItem>
            ))}
          </List>
        )}
      </QueryGuard>
    </Stack>
  );
}
