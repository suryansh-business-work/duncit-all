import { useEffect, useMemo, useState } from 'react';
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
import PexelsPhotosTab from './PexelsPhotosTab';
import PexelsVideosTab from './PexelsVideosTab';
import { useDeviceUpload } from './useDeviceUpload';

interface MediaPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onPicked: (url: string) => void;
  /** ImageKit folder e.g. "/users", "/posts", "/branding" */
  folder?: string;
  title?: string;
  /** Comma-separated mime list. Defaults to images. */
  accept?: string;
}

export default function MediaPickerDialog({
  open,
  onClose,
  onPicked,
  folder = '/uploads',
  title = 'Select an image',
  accept = 'image/*,video/*',
}: MediaPickerDialogProps) {
  const [tab, setTab] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const allowImage = useMemo(() => /image\//.test(accept) || accept === '*', [accept]);
  const allowVideo = useMemo(() => /video\//.test(accept) || accept === '*', [accept]);

  const device = useDeviceUpload({ open, folder, onPicked, onClose, setError });

  useEffect(() => {
    if (!open) return;
    setError(null);
  }, [open]);

  return (
    <Dialog open={open} onClose={device.uploading ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ pr: 6 }}>
        {title}
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
        <Tab label="Upload from device" />
        <Tab label="Pexels photos" disabled={!allowImage} />
        <Tab label="Pexels videos" disabled={!allowVideo} />
      </Tabs>
      <DialogContent dividers sx={{ minHeight: 380 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: tab === 0 ? 'block' : 'none' }}>
          <DeviceUploadTab
            accept={accept}
            fileInputRef={device.fileInputRef}
            picked={device.picked}
            previewUrl={device.previewUrl}
            uploadPct={device.uploadPct}
            uploading={device.uploading}
            onPickFile={device.onPickFile}
          />
        </Box>

        <Box sx={{ display: tab === 1 ? 'block' : 'none' }}>
          <PexelsPhotosTab
            active={tab === 1 && allowImage}
            open={open}
            folder={folder}
            onPicked={onPicked}
            onClose={onClose}
            setError={setError}
          />
        </Box>

        <Box sx={{ display: tab === 2 ? 'block' : 'none' }}>
          <PexelsVideosTab
            active={tab === 2 && allowVideo}
            open={open}
            folder={folder}
            onPicked={onPicked}
            onClose={onClose}
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
            variant="contained"
            disabled={!device.picked || device.uploading}
            onClick={device.uploadFromDevice}
            startIcon={device.uploading ? <CircularProgress size={16} /> : <CloudUploadIcon />}
          >
            {device.uploading ? 'Uploading…' : 'Upload to ImageKit'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
