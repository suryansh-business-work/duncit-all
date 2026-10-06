import { useMutation, useQuery } from '@apollo/client/react';
import {
  Alert,
  Dialog,
  DialogContent,
  DialogTitle,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import type { CmsVersionOwner } from '@duncit/gql-types';
import { CMS_VERSIONS, RESTORE_CMS_VERSION, type CmsVersionsData } from '../queries/fragments';

interface Props {
  owner: { kind: CmsVersionOwner; id: string; name: string } | null;
  onClose: () => void;
  /** Called after a restore, so the caller can refresh its "unpublished changes" flag. */
  onRestored: () => void;
}

/** Every published version of a page or fragment, newest first, restorable into the draft. */
export default function VersionsDialog({ owner, onClose, onRestored }: Readonly<Props>) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { formatDateTime } = useDateFormat();
  const { data, loading, error } = useQuery<CmsVersionsData>(CMS_VERSIONS, {
    variables: { owner: owner?.kind, id: owner?.id },
    skip: !owner,
    fetchPolicy: 'network-only',
  });
  const [restore, { loading: restoring }] = useMutation(RESTORE_CMS_VERSION);
  const versions = data?.cmsVersions ?? [];

  const askRestore = async (id: string, version: number) => {
    const ok = await confirm({
      title: t('websiteApp.cms.versions.restoreTitle'),
      message: t('websiteApp.cms.versions.restoreText', { vars: { version } }),
      confirmLabel: t('websiteApp.cms.versions.restore'),
    });
    if (!ok) return;
    try {
      await restore({ variables: { id } });
      notifySuccess(t('websiteApp.cms.versions.restored'));
      onRestored();
      onClose();
    } catch {
      notifyError(t('websiteApp.cms.versions.restoreFailed'));
    }
  };

  return (
    <Dialog open={Boolean(owner)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {t('websiteApp.cms.versions.title')} — {owner?.name}
      </DialogTitle>
      <DialogContent dividers>
        {loading && <LinearProgress />}
        {error && <Alert severity="error">{t('websiteApp.cms.versions.loadFailed')}</Alert>}
        {!loading && !error && versions.length === 0 && <Typography color="text.secondary">{t('websiteApp.cms.versions.empty')}</Typography>}
        <List disablePadding>
          {versions.map((version) => (
            <ListItem
              key={version.id}
              divider
              secondaryAction={
                <DuncitButton
                  size="small"
                  disabled={restoring}
                  onClick={() => {
                    askRestore(version.id, version.version).catch(() => notifyError(t('websiteApp.cms.versions.restoreFailed')));
                  }}
                >
                  {t('websiteApp.cms.versions.restore')}
                </DuncitButton>
              }
            >
              <ListItemText
                primary={t('websiteApp.cms.versions.version', { vars: { version: version.version } })}
                secondary={t('websiteApp.cms.versions.publishedBy', { vars: { date: formatDateTime(version.created_at) } })}
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>
    </Dialog>
  );
}
