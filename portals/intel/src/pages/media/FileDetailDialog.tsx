import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';
import { formatDateTime, useTranslation } from '@duncit/app-settings';
import { ConfirmDialog } from '@duncit/dialogs';
import { fireAndForget } from '@duncit/logs';
import { formatBytes } from '@duncit/utils';
import { useBootstrap } from '../../components/IntelBootstrap';
import type { IntelMedia } from '../../graphql/media';
import { intelLog } from '../../lib/logger';
import { fileObjectUrl } from '../../lib/rest';
import { FileDetailsForm } from './file-details';
import FilePreview from './FilePreview';
import { INDEX_KEYS } from './labels';
import { useFileActions } from './useFileActions';

interface Props {
  file: IntelMedia | null;
  folders: string[];
  onClose: () => void;
  onChanged: () => void;
}

/** One file: preview, details, index state and every action the owner has. */
export default function FileDetailDialog({ file, folders, onClose, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const { data: boot } = useBootstrap();
  const actions = useFileActions(onChanged);
  const [purging, setPurging] = useState(false);
  if (!file) return null;
  const owner = file.owner_id === boot?.me.user_id || boot?.me.can_super === true;
  const after = (ok: Promise<boolean>) => fireAndForget(ok.then((done) => done && onClose()), intelLog, '/media', 'FileDetailDialog');
  const download = () =>
    fireAndForget(
      fileObjectUrl(file.id).then((url) => {
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      }),
      intelLog,
      '/media',
      'FileDetailDialog.download'
    );

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md" fullScreen={fullScreen} aria-labelledby="intel-file-title">
      <DialogTitle id="intel-file-title" sx={{ wordBreak: 'break-word' }}>
        {file.name}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 7 }}>
            <FilePreview id={file.id} mime={file.mime} name={file.name} />
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <Stack spacing={1.5}>
              <Typography variant="body2" color="text.secondary">
                {t('intel.media.meta', { vars: { size: formatBytes(file.size), type: file.mime, when: formatDateTime(file.created_at) } })}
              </Typography>
              <Typography variant="body2">{t('intel.media.indexLine', { vars: { status: t(INDEX_KEYS[file.index_status] ?? 'intel.media.index.PENDING'), pages: file.page_count, chunks: file.chunk_count } })}</Typography>
              {file.index_warning && <Alert severity={file.index_status === 'FAILED' ? 'error' : 'warning'}>{file.index_warning}</Alert>}
              {!owner && <Alert severity="info">{t('intel.media.notOwner')}</Alert>}
              <FileDetailsForm values={{ name: file.name, folder: file.folder, visibility: file.visibility as 'PRIVATE' | 'TEAM' | 'ADMINS' }} folders={folders} saving={actions.saving} disabled={!owner || file.deleted} errorMessage={actions.saveError} onSubmit={(v) => fireAndForget(actions.save(file, v), intelLog, '/media', 'FileDetailDialog.save')} />
            </Stack>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Button onClick={download}>{t('intel.media.download')}</Button>
        {owner && !file.deleted && (
          <>
            <Button onClick={() => fireAndForget(actions.toggleFavorite(file), intelLog, '/media', 'fav')} disabled={actions.busy}>
              {file.favorite ? t('intel.media.unfavorite') : t('intel.media.favorite')}
            </Button>
            <Button onClick={() => fireAndForget(actions.reindex(file), intelLog, '/media', 'reindex')} disabled={actions.busy || file.archived}>
              {t('intel.media.reindex')}
            </Button>
            <Button onClick={() => after(actions.toggleArchive(file))} disabled={actions.busy}>
              {file.archived ? t('intel.media.unarchive') : t('intel.media.archive')}
            </Button>
            <Button color="error" onClick={() => after(actions.trash(file))} disabled={actions.busy}>
              {t('intel.media.trash')}
            </Button>
          </>
        )}
        {owner && file.deleted && (
          <>
            <Button onClick={() => after(actions.restore(file))} disabled={actions.busy}>
              {t('intel.media.restore')}
            </Button>
            <Button color="error" onClick={() => setPurging(true)} disabled={actions.busy}>
              {t('intel.media.purge')}
            </Button>
          </>
        )}
        <Button onClick={onClose}>{t('intel.common.close')}</Button>
      </DialogActions>
      <ConfirmDialog open={purging} title={t('intel.media.purgeTitle')} message={t('intel.media.purgeText', { vars: { name: file.name } })} destructive busy={actions.busy} confirmLabel={t('intel.media.purge')} onConfirm={() => after(actions.purge(file))} onClose={() => setPurging(false)} />
    </Dialog>
  );
}
