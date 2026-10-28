import { useId } from 'react';
import { useNavigate } from 'react-router';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { Alert, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { SectionCard } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import type { LiteEvent, LiteEventStats } from '../../../../shared/graphql/documents';
import { useWebT } from '../../../../shared/i18n';
import { useLiteSession } from '../../../../shared/session';
import { LITE_DELETE_EVENT } from '../../../graphql/events';
import { paths } from '../../../lib/paths';

/** Guests who hold or wait for a place; any one of them stops a delete. */
const activeGuests = ({ going, waitlisted, pending, payment_pending }: LiteEventStats): number => going + waitlisted + pending + payment_pending;

/**
 * The creator's way out of an event nobody is coming to. Co-hosts do not see
 * it; while guests are registered the button waits and says why. The server
 * checks the same, and refuses too when a guest's payment is on record.
 */
export function DeleteEventCard({ event }: Readonly<{ event: LiteEvent }>) {
  const { t } = useWebT();
  const { me } = useLiteSession();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const client = useApolloClient();
  const blockedId = useId();
  const [deleteEvent, { loading }] = useMutation(LITE_DELETE_EVENT);
  if (!event.hosts.some((host) => host.role === 'HOST' && host.user_id === me?.id)) return null;
  const blocked = activeGuests(event.stats) > 0;

  const remove = async () => {
    const ok = await confirm({
      title: t('liteWeb.manage.delete.confirmTitle'),
      message: t('liteWeb.manage.delete.confirmBody', { vars: { title: event.title } }),
      confirmLabel: t('liteWeb.manage.delete.title'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteEvent({ variables: { id: event.id } });
      notifySuccess(t('liteWeb.manage.delete.done'));
      navigate(paths.events, { replace: true });
      // Dropped after leaving the page, so it never renders without its event; every list loses the card at once.
      client.cache.evict({ id: client.cache.identify({ __typename: 'LiteEvent', id: event.id }) });
      client.cache.gc();
    } catch (error) {
      notifyError(parseApiError(error));
    }
  };

  return (
    <SectionCard title={t('liteWeb.manage.delete.title')} subtitle={t('liteWeb.manage.delete.body')}>
      <Stack spacing={1.5} sx={{ alignItems: 'flex-start' }}>
        {blocked ? (
          <Alert id={blockedId} severity="info" sx={{ alignSelf: 'stretch' }} data-testid="settings-delete-blocked">
            {t('liteWeb.manage.delete.blocked')}
          </Alert>
        ) : null}
        <DuncitButton
          variant="outlined"
          color="error"
          onClick={remove}
          disabled={blocked}
          loading={loading}
          aria-describedby={blocked ? blockedId : undefined}
          data-testid="settings-delete"
        >
          {t('liteWeb.manage.delete.title')}
        </DuncitButton>
      </Stack>
    </SectionCard>
  );
}
