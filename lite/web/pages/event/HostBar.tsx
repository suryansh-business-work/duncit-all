import { Link as RouterLink } from 'react-router';
import { useMutation } from '@apollo/client/react';
import { Alert, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import type { LiteEvent } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';
import { LITE_PUBLISH_EVENT } from '../../graphql/events';
import { paths } from '../../lib/paths';

/** What a host sees above their own event: Manage, Edit, and Publish while it is still a draft. */
export function HostBar({ event, onChanged }: Readonly<{ event: LiteEvent; onChanged: () => void }>) {
  const { t } = useWebT();
  const confirm = useConfirm();
  const [publishEvent, publishState] = useMutation(LITE_PUBLISH_EVENT);

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

  const draft = event.status === 'DRAFT';
  return (
    <Alert severity={draft ? 'warning' : 'info'} icon={false} sx={{ '& .MuiAlert-message': { width: '100%' } }} data-testid="host-bar">
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
        <span>{draft ? t('liteWeb.event.draftBanner') : t('liteWeb.event.hostBanner')}</span>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          <DuncitButton component={RouterLink} to={paths.eventManage(event.slug)} variant="outlined" size="small" data-testid="host-manage">
            {t('liteWeb.event.manage')}
          </DuncitButton>
          {event.status === 'CANCELLED' ? null : (
            <DuncitButton component={RouterLink} to={paths.eventEdit(event.slug)} variant="outlined" size="small" data-testid="host-edit">
              {t('lite.common.edit')}
            </DuncitButton>
          )}
          {draft ? (
            <DuncitButton variant="contained" size="small" onClick={publish} loading={publishState.loading} data-testid="host-publish">
              {t('liteWeb.event.publish')}
            </DuncitButton>
          ) : null}
        </Stack>
      </Stack>
    </Alert>
  );
}
