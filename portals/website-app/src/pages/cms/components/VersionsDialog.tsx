import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Dialog, DialogContent, DialogTitle, LinearProgress, List, Typography } from '@mui/material';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import type { CmsVersionOwner } from '@duncit/gql-types';
import { CMS_VERSIONS, PUBLISH_CMS_VERSION, RESTORE_CMS_VERSION, type CmsVersionsData } from '../queries/fragments';
import { cmsErrorMessage } from '../lib/errors';
import VersionRow from './VersionRow';

interface Props {
  owner: { kind: CmsVersionOwner; id: string; name: string } | null;
  onClose: () => void;
  /** Called after a restore or publish, so the caller can refresh its "unpublished changes" flag. */
  onRestored: () => void;
}

type Version = CmsVersionsData['cmsVersions'][number];

/**
 * Every published version of a page or fragment, newest first — each with its
 * own live-demo link (a page's real address behind a signed preview flag), and
 * restorable into the draft or published straight back to the live site.
 */
export default function VersionsDialog({ owner, onClose, onRestored }: Readonly<Props>) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { data, loading, error, refetch } = useQuery<CmsVersionsData>(CMS_VERSIONS, {
    variables: { owner: owner?.kind, id: owner?.id },
    skip: !owner,
    fetchPolicy: 'network-only',
  });
  const [restore, { loading: restoring }] = useMutation(RESTORE_CMS_VERSION);
  const [publish, { loading: publishing }] = useMutation(PUBLISH_CMS_VERSION);
  const versions = data?.cmsVersions ?? [];

  const askRestore = async (version: Version) => {
    const ok = await confirm({
      title: t('websiteApp.cms.versions.restoreTitle'),
      message: t('websiteApp.cms.versions.restoreText', { vars: { version: version.version } }),
      confirmLabel: t('websiteApp.cms.versions.restore'),
    });
    if (!ok) return;
    try {
      await restore({ variables: { id: version.id } });
      notifySuccess(t('websiteApp.cms.versions.restored'));
      onRestored();
      onClose();
    } catch (failure) {
      notifyError(cmsErrorMessage(failure, t('websiteApp.cms.versions.restoreFailed')));
    }
  };

  const askPublish = async (version: Version) => {
    const ok = await confirm({
      title: t('websiteApp.cms.versions.publishTitle', { vars: { version: version.version } }),
      message: t('websiteApp.cms.versions.publishText', { vars: { version: version.version } }),
      confirmLabel: t('websiteApp.cms.versions.publish'),
    });
    if (!ok) return;
    try {
      await publish({ variables: { id: version.id } });
      notifySuccess(t('websiteApp.cms.versions.published', { vars: { version: version.version } }));
      onRestored();
      await refetch();
    } catch (failure) {
      notifyError(cmsErrorMessage(failure, t('websiteApp.cms.versions.publishFailed')));
    }
  };

  return (
    <Dialog open={Boolean(owner)} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        {t('websiteApp.cms.versions.title')} — {owner?.name}
      </DialogTitle>
      <DialogContent dividers>
        {loading && <LinearProgress aria-label={t('websiteApp.cms.versions.loading')} />}
        {error && <Alert severity="error">{t('websiteApp.cms.versions.loadFailed')}</Alert>}
        {!loading && !error && versions.length === 0 && <Typography color="text.secondary">{t('websiteApp.cms.versions.empty')}</Typography>}
        <List disablePadding>
          {versions.map((version) => (
            <VersionRow
              key={version.id}
              version={version}
              busy={restoring || publishing}
              onRestore={(v) => {
                askRestore(v).catch(() => notifyError(t('websiteApp.cms.versions.restoreFailed')));
              }}
              onPublish={(v) => {
                askPublish(v).catch(() => notifyError(t('websiteApp.cms.versions.publishFailed')));
              }}
            />
          ))}
        </List>
      </DialogContent>
    </Dialog>
  );
}
