import { useState } from 'react';
import {
  Alert,
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Snackbar,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitIconButton } from '@duncit/buttons';
import FileDetailsView from './FileDetailsView';
import FileGrid from './FileGrid';
import FileManagerToolbar from './FileManagerToolbar';
import FilePager from './FilePager';
import type { MediaItem } from './queries';
import { useFileManager } from './useFileManager';
import { useTranslation } from '../i18n/useTranslation';

/** The roles the server lets change or destroy a file. Reading is anyone. */
const WRITE_ROLES = new Set(['SUPER_ADMIN', 'TECH_MANAGER']);

/** Narrow enough that the grid keeps most of the dialog, wide enough for the
 * transformation fields to sit two to a row. */
const DETAILS_WIDTH = 350;

/**
 * Everything the product has uploaded, in one place.
 *
 * The files are ImageKit's, read and written through the server because the
 * management API needs the private key. Nothing about them is stored here — a
 * second index of a media library is a second thing to be wrong.
 */
interface Props {
  open: boolean;
  onClose: () => void;
  /**
   * The signed-in user's roles, from the header that opened this. Read as a
   * prop rather than from a context so the tool works in any portal, whether or
   * not one is mounted above the header.
   */
  roles?: readonly string[] | null;
}

export function FileManagerDialog({ open, onClose, roles }: Readonly<Props>) {
  const { t } = useTranslation();
  const manager = useFileManager(open);
  const [active, setActive] = useState<MediaItem | null>(null);
  const [toast, setToast] = useState<{ text: string; kind: 'success' | 'error' } | null>(null);

  const canWrite = (roles ?? []).some((role) => WRITE_ROLES.has(role));

  // In grid order, not selection order: the stepper should walk the files the
  // way they are laid out, or "next" jumps around the screen.
  const selectedFiles = manager.files.filter((file) => manager.selected.includes(file.fileId));

  const say = (text: string, kind: 'success' | 'error' = 'success') => setToast({ text, kind });
  const dismissToast = () => setToast(null);

  const copy = (url: string) => {
    manager
      .copy(url)
      .then(() => say(t('shell.fileManager.linkCopied')))
      .catch((err: Error) => say(err.message, 'error'));
  };

  const upload = (list: FileList) => {
    manager
      .uploadFiles(list)
      .then(() => say(t('shell.fileManager.uploadedCount', { count: list.length })))
      .catch((err: Error) => say(err.message, 'error'));
  };

  const deleteSelected = () => {
    manager
      .removeSelected()
      .then((gone) => say(t('shell.fileManager.deletedCount', { count: gone })))
      .catch((err: Error) => say(err.message, 'error'));
  };

  const deleteOne = (file: MediaItem) => {
    setActive(null);
    manager
      .removeOne(file.fileId)
      .then((gone) => say(gone > 0 ? t('shell.fileManager.deleted', { vars: { name: file.name } }) : t('shell.fileManager.deleteNothing'), gone > 0 ? 'success' : 'error'))
      .catch((err: Error) => say(err.message, 'error'));
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xl" scroll="paper">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6">{t('shell.fileManager.title')}</Typography>
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {t('shell.fileManager.subtitle')}
          </Typography>
        </Box>
        <DuncitIconButton onClick={onClose} aria-label={t('shell.fileManager.close')}>
          <CloseIcon />
        </DuncitIconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ display: 'flex', gap: 0, p: 0 }}>
        <Box sx={{ flex: 1, minWidth: 0, p: 2, overflowY: 'auto' }}>
        <FileManagerToolbar
          search={manager.search}
          onSearch={manager.setSearch}
          fileType={manager.fileType}
          onFileType={manager.setFileType}
          sort={manager.sort}
          onSort={manager.setSort}
          selectedCount={manager.selected.length}
          canWrite={canWrite}
          uploading={manager.uploading}
          onUpload={upload}
          onDeleteSelected={deleteSelected}
          onRefresh={() => { manager.refetch().catch(() => undefined); }}
        />

        {(manager.uploading || manager.loading) && <LinearProgress sx={{ mb: 2 }} />}
        {manager.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {manager.error}
          </Alert>
        )}

        <FileGrid
          files={manager.files}
          selected={manager.selected}
          loading={manager.loading}
          search={manager.search}
          onToggle={manager.toggle}
          onOpen={setActive}
          onCopy={copy}
        />

        <FilePager
          page={manager.page}
          count={manager.files.length}
          loading={manager.loading}
          hasMore={manager.hasMore}
          onPage={manager.setPage}
        />
        </Box>

        {active && (
          <Box
            sx={{
              width: DETAILS_WIDTH,
              flexShrink: 0,
              borderLeft: 1,
              borderColor: 'divider',
              p: 1.5,
              overflowY: 'auto',
            }}
          >
            <FileDetailsView
              file={active}
              canWrite={canWrite}
              onBack={() => setActive(null)}
              onCopy={copy}
              onDelete={deleteOne}
              onChanged={(file) => {
                setActive(file);
                manager.refetch().catch(() => undefined);
                say('Saved');
              }}
              onError={(message) => say(message, 'error')}
              siblings={selectedFiles}
              onNavigate={setActive}
            />
          </Box>
        )}
      </DialogContent>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3000}
        onClose={dismissToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast?.kind ?? 'success'} onClose={dismissToast}>
          {toast?.text}
        </Alert>
      </Snackbar>
    </Dialog>
  );
}
