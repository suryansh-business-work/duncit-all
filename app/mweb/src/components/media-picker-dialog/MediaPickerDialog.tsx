import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Alert,
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
import { UPLOAD_IMAGE } from './queries';
import { MediaPickerDialogProps } from './types';

export default function MediaPickerDialog({
  open,
  onClose,
  onPicked,
  folder = '/uploads',
  title = 'Select media',
  accept = 'image/*,video/*',
}: Readonly<MediaPickerDialogProps>) {
  const [tab, setTab] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [picked, setPicked] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const [uploadImageMut] = useMutation(UPLOAD_IMAGE);

  const allowImage = useMemo(() => /image\//.test(accept) || accept === '*', [accept]);
  const allowVideo = useMemo(() => /video\//.test(accept) || accept === '*', [accept]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setPicked(null);
    setPreviewUrl(null);
    setUploadPct(null);
    setUploading(false);
  }, [open]);

  useEffect(() => {
    if (!picked) {
      setPreviewUrl(null);
      return;
    }
    const u = URL.createObjectURL(picked);
    setPreviewUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [picked]);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const isImage = f.type.startsWith('image/');
    const isVideo = f.type.startsWith('video/');
    if (!isImage && !isVideo) {
      setError('Please choose an image or video file');
      return;
    }
    const maxBytes = isVideo ? 100 * 1024 * 1024 : 15 * 1024 * 1024;
    if (f.size > maxBytes) {
      setError(isVideo ? 'Video is too large (max 100 MB)' : 'Image is too large (max 15 MB)');
      return;
    }
    setError(null);
    setPicked(f);
  };

  const uploadFromDevice = async () => {
    if (!picked) return;
    setUploading(true);
    setUploadPct(10);
    setError(null);
    try {
      const fileBase64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.onerror = () => reject(new Error('Could not read selected file'));
        reader.readAsDataURL(picked);
      });
      setUploadPct(55);
      const res = await uploadImageMut({
        variables: { fileBase64, fileName: picked.name, mimeType: picked.type, folder },
      });
      const url = res.data?.uploadImageToImagekit?.url;
      if (!url) throw new Error('No URL returned from ImageKit upload');
      setUploadPct(100);
      onPicked(url);
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
      setUploadPct(null);
    }
  };

  return (
    <Dialog open={open} onClose={uploading ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ pr: 6 }}>
        {title}
        <IconButton
          onClick={onClose}
          disabled={uploading}
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
        <div style={{ display: tab === 0 ? 'block' : 'none' }}>
          <DeviceUploadTab
            fileInputRef={fileInputRef}
            accept={accept}
            picked={picked}
            previewUrl={previewUrl}
            uploadPct={uploadPct}
            uploading={uploading}
            onPickFile={onPickFile}
          />
        </div>
        {allowImage && (
          <div style={{ display: tab === 1 ? 'block' : 'none' }}>
            <PexelsPhotosTab
              active={tab === 1}
              open={open}
              folder={folder}
              onPicked={onPicked}
              onClose={onClose}
              onError={setError}
            />
          </div>
        )}
        {allowVideo && (
          <div style={{ display: tab === 2 ? 'block' : 'none' }}>
            <PexelsVideosTab
              active={tab === 2}
              open={open}
              folder={folder}
              onPicked={onPicked}
              onClose={onClose}
              onError={setError}
            />
          </div>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={uploading}>
          Cancel
        </Button>
        {tab === 0 && (
          <Button
            variant="contained"
            disabled={!picked || uploading}
            onClick={uploadFromDevice}
            startIcon={uploading ? <CircularProgress size={16} /> : <CloudUploadIcon />}
          >
            {uploading ? 'Uploading…' : 'Upload to ImageKit'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
