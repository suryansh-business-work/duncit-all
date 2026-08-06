import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FileCard from './FileCard';
import FileDetailsView from './FileDetailsView';
import FileManagerToolbar from './FileManagerToolbar';
import { PAGE_SIZE, type MediaItem } from './queries';
import { useFileManager } from './useFileManager';

/** The roles the server lets change or destroy a file. Reading is anyone. */
const WRITE_ROLES = new Set(['SUPER_ADMIN', 'TECH_MANAGER']);

/** Narrow enough that the grid keeps most of the dialog, wide enough for the
 * transformation fields to sit two to a row. */
const DETAILS_WIDTH = 350;

const GRID_SX = {
  display: 'grid',
  gap: 1.5,
  gridTemplateColumns: {
    xs: 'repeat(2, 1fr)',
    sm: 'repeat(3, 1fr)',
    md: 'repeat(5, 1fr)',
    lg: 'repeat(6, 1fr)',
  },
};

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
  const manager = useFileManager(open);
  const [active, setActive] = useState<MediaItem | null>(null);
  const [toast, setToast] = useState<{ text: string; kind: 'success' | 'error' } | null>(null);

  const canWrite = (roles ?? []).some((role) => WRITE_ROLES.has(role));

  // In grid order, not selection order: the stepper should walk the files the
  // way they are laid out, or "next" jumps around the screen.
  const selectedFiles = manager.files.filter((file) => manager.selected.includes(file.fileId));

  const say = (text: string, kind: 'success' | 'error' = 'success') => setToast({ text, kind });

  const copy = (url: string) => {
    manager
      .copy(url)
      .then(() => say('Link copied'))
      .catch((err: Error) => say(err.message, 'error'));
  };

  const upload = (list: FileList) => {
    manager
      .uploadFiles(list)
      .then(() => say(`Uploaded ${list.length} file${list.length === 1 ? '' : 's'}`))
      .catch((err: Error) => say(err.message, 'error'));
  };

  const deleteSelected = () => {
    manager
      .removeSelected()
      .then((gone) => say(`Deleted ${gone} file${gone === 1 ? '' : 's'}`))
      .catch((err: Error) => say(err.message, 'error'));
  };

  const deleteOne = (file: MediaItem) => {
    setActive(null);
    manager
      .removeOne(file.fileId)
      .then((gone) => say(gone > 0 ? `Deleted ${file.name}` : 'Nothing was deleted', gone > 0 ? 'success' : 'error'))
      .catch((err: Error) => say(err.message, 'error'));
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xl" scroll="paper">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6">File Manager</Typography>
          <Typography variant="caption" color="text.secondary">
            Every file uploaded to ImageKit. Upload, find one, copy its link at any size.
          </Typography>
        </Box>
        <IconButton onClick={onClose} aria-label="Close file manager">
          <CloseIcon />
        </IconButton>
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
          onRefresh={() => void manager.refetch()}
        />

        {(manager.uploading || manager.loading) && <LinearProgress sx={{ mb: 2 }} />}
        {manager.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {manager.error}
          </Alert>
        )}

        {manager.files.length === 0 && !manager.loading ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
            {manager.search ? `Nothing matches “${manager.search}”.` : 'Nothing uploaded yet.'}
          </Typography>
        ) : (
          <Box
            sx={{
              ...GRID_SX,
              opacity: manager.loading ? 0.5 : 1,
              transition: (theme) => theme.transitions.create('opacity'),
            }}
          >
            {manager.files.map((file) => (
              <FileCard
                key={file.fileId}
                file={file}
                selected={manager.selected.includes(file.fileId)}
                onToggle={manager.toggle}
                onOpen={setActive}
                onCopy={(item) => copy(item.url)}
              />
            ))}
          </Box>
        )}

        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="center"
          sx={{ pt: 3 }}
        >
          <Button
            size="small"
            disabled={manager.page === 0 || manager.loading}
            onClick={() => manager.setPage(manager.page - 1)}
          >
            Previous
          </Button>
          {/* The spinner sits in the pager, where the click was — a bar at the
              top of a scrolled dialog is somewhere nobody is looking. */}
          {manager.loading ? (
            <CircularProgress size={18} />
          ) : (
            <Typography variant="body2">
              {manager.page * PAGE_SIZE + 1}–{manager.page * PAGE_SIZE + manager.files.length}
            </Typography>
          )}
          <Button
            size="small"
            disabled={!manager.hasMore || manager.loading}
            onClick={() => manager.setPage(manager.page + 1)}
          >
            Next
          </Button>
        </Stack>
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
                void manager.refetch();
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
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast?.kind ?? 'success'} onClose={() => setToast(null)}>
          {toast?.text}
        </Alert>
      </Snackbar>
    </Dialog>
  );
}
