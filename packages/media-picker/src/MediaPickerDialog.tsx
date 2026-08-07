import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from './i18n/useTranslation';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tab,
  Tabs,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeviceUploadTab from './DeviceUploadTab';
import SelectionTray from './SelectionTray';
import PexelsPhotosTab from './PexelsPhotosTab';
import PexelsVideosTab from './PexelsVideosTab';
import { useDeviceUpload } from './useDeviceUpload';
import { useMediaSelection } from './useMediaSelection';
import type { MediaPickerDialogProps } from './types';

/** A close that does nothing — multi-pick stays open between picks. */
const noop = () => {};

export default function MediaPickerDialog({
  open,
  onClose,
  onPicked,
  folder = '/uploads',
  title,
  accept = 'image/*,video/*',
  allowDocuments,
  surface = 'PORTALS',
  max = 1,
  onPickedMany,
  seedQuery,
  orientation,
}: Readonly<MediaPickerDialogProps>) {
  const { t } = useTranslation();
  // Resolved in the body, not as a default parameter: a hook cannot run in
  // the parameter list, and a caller-supplied heading must still win.
  const heading = title ?? t('media.picker.title');
  const [tab, setTab] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const multi = max > 1;
  const selection = useMediaSelection(max, open);

  // The seam that makes multi-pick cheap: every tab already ends a pick with
  // `onPicked(url); onClose()`. Hand them a close that does nothing and the
  // dialog stays open while the picks pile up in the tray — no tab has to know
  // which mode it is in.
  const handlePicked = multi ? selection.add : onPicked;
  const closeAfterPick = multi ? noop : onClose;

  const done = () => {
    onPickedMany?.(selection.urls);
    onClose();
  };

  const allowImage = useMemo(() => /image\//.test(accept) || accept === '*', [accept]);
  const allowVideo = useMemo(() => /video\//.test(accept) || accept === '*', [accept]);
  // Documents are opt-in: an explicit prop wins, otherwise a pdf in the accept
  // list enables them (how every call site drives this today).
  const allowDocs = useMemo(
    () => allowDocuments ?? /pdf/i.test(accept),
    [allowDocuments, accept],
  );

  const device = useDeviceUpload({
    open,
    folder,
    surface,
    allowImage,
    allowVideo,
    allowDocuments: allowDocs,
    onPicked: handlePicked,
    onClose: closeAfterPick,
    // Multi-pick keeps the dialog open, so the tab has to let go of the file it
    // just sent or the next Upload button press would send it again.
    clearAfterUpload: multi,
    setError,
  });

  useEffect(() => {
    if (!open) return;
    setError(null);
  }, [open]);

  return (
    <Dialog open={open} onClose={device.uploading ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ pr: 6 }}>
        {heading}
        <IconButton
          onClick={onClose}
          disabled={device.uploading}
          sx={{ position: 'absolute', right: 8, top: 8 }}
          size="small"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <Tabs
        value={tab}
        onChange={(_e, v) => setTab(v)}
        sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label={t('media.picker.fromDevice')} />
        <Tab label={t('media.picker.pexelsPhotos')} disabled={!allowImage} />
        <Tab label={t('media.picker.pexelsVideos')} disabled={!allowVideo} />
      </Tabs>
      <DialogContent dividers sx={{ minHeight: 380 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {multi && (
          <SelectionTray urls={selection.urls} max={max} onRemove={selection.remove} />
        )}

        <Box sx={{ display: tab === 0 ? 'block' : 'none' }}>
          <DeviceUploadTab
            accept={accept}
            fileInputRef={device.fileInputRef}
            picked={device.picked}
            previewUrl={device.previewUrl}
            uploadPct={device.uploadPct}
            uploading={device.uploading}
            stage={device.stage}
            settings={device.settings}
            cropKey={device.cropKey}
            onSelectCropKey={device.setCropKey}
            onCropComplete={device.setCropRect}
            onPickFile={device.onPickFile}
          />
        </Box>

        <Box sx={{ display: tab === 1 ? 'block' : 'none' }}>
          <PexelsPhotosTab
            active={tab === 1 && allowImage}
            open={open}
            folder={folder}
            seedQuery={seedQuery}
            defaultOrientation={orientation}
            multi={multi}
            atLimit={selection.atLimit}
            onPicked={handlePicked}
            onClose={closeAfterPick}
            setError={setError}
          />
        </Box>

        <Box sx={{ display: tab === 2 ? 'block' : 'none' }}>
          <PexelsVideosTab
            active={tab === 2 && allowVideo}
            open={open}
            folder={folder}
            onPicked={handlePicked}
            onClose={closeAfterPick}
            setError={setError}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={device.uploading}>
          Cancel
        </Button>
        {tab === 0 && (
          <Button
            variant={multi ? 'outlined' : 'contained'}
            disabled={!device.picked || device.uploading || (multi && selection.atLimit)}
            onClick={device.uploadFromDevice}
            startIcon={device.uploading ? <CircularProgress size={16} /> : <CloudUploadIcon />}
          >
            {device.uploading ? t('media.picker.uploading') : t('media.picker.uploadToImagekit')}
          </Button>
        )}
        {multi && (
          <Button
            variant="contained"
            onClick={done}
            disabled={selection.urls.length === 0 || device.uploading}
          >
            {selection.urls.length > 1
              ? `Use these ${selection.urls.length}`
              : t('media.picker.useThis')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
