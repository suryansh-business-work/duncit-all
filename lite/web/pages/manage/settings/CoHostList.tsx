import { useMutation } from '@apollo/client/react';
import { Chip, List, ListItem, ListItemAvatar, ListItemText } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import type { LiteEvent, LiteHost } from '../../../../shared/graphql/documents';
import { useWebT } from '../../../../shared/i18n';
import { UserAvatar } from '../../../components/UserAvatar';
import { LITE_REMOVE_CO_HOST } from '../../../graphql/manage';

/** The hosts, with a way to drop a co-host; the main host stays. */
export function CoHostList({ event, onChanged }: Readonly<{ event: LiteEvent; onChanged: () => void }>) {
  const { t } = useWebT();
  const confirm = useConfirm();
  const [removeCoHost] = useMutation(LITE_REMOVE_CO_HOST);

  const remove = async (host: LiteHost) => {
    const ok = await confirm({
      title: t('liteWeb.manage.settings.removeCoHost'),
      message: t('liteWeb.manage.settings.removeCoHostBody', { vars: { name: host.name } }),
      confirmLabel: t('liteWeb.manage.settings.removeCoHost'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await removeCoHost({ variables: { event_id: event.id, user_id: host.user_id } });
      notifySuccess(t('liteWeb.manage.settings.coHostRemoved'));
      onChanged();
    } catch (error) {
      notifyError(parseApiError(error));
    }
  };

  return (
    <List dense disablePadding data-testid="co-host-list">
      {event.hosts.map((host) => (
        <ListItem
          key={host.user_id}
          divider
          secondaryAction={
            host.role === 'CO_HOST' ? (
              <DuncitIconButton aria-label={t('liteWeb.manage.settings.removeCoHostAria', { vars: { name: host.name } })} onClick={() => remove(host)} data-testid={`co-host-remove-${host.user_id}`}>
                <DeleteOutlineIcon />
              </DuncitIconButton>
            ) : (
              <Chip size="small" label={t('liteWeb.manage.settings.mainHost')} />
            )
          }
        >
          <ListItemAvatar>
            <UserAvatar name={host.name} url={host.avatar_url} size={36} />
          </ListItemAvatar>
          <ListItemText primary={host.name} secondary={`@${host.handle}`} />
        </ListItem>
      ))}
    </List>
  );
}
