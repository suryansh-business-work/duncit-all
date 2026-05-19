import { createContext, useContext, useMemo, useRef, useState } from 'react';
import { Alert, Box, Button, LinearProgress, Snackbar, Stack, Typography } from '@mui/material';
import { apolloClient } from '../../apollo';
import { ADD_POD_STATUS, CREATE_STATUS_POST, UPLOAD_STATUS_MEDIA } from './queries';

type StatusUploadKind = 'profile' | 'pod';
type MediaType = 'IMAGE' | 'VIDEO';

interface StatusUploadState {
  active: boolean;
  kind: StatusUploadKind | null;
  progress: number;
  message: string;
  profileUrl?: string | null;
}

interface StatusUploadContextValue {
  upload: StatusUploadState;
  openProfilePicker: () => void;
  openPodPicker: (podId: string) => void;
}

const StatusUploadContext = createContext<StatusUploadContextValue | null>(null);
const IDLE: StatusUploadState = { active: false, kind: null, progress: 0, message: '' };
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

function toBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read selected media'));
    reader.readAsDataURL(file);
  });
}

function mediaTypeOf(file: File): MediaType {
  return file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE';
}

function validateFile(file: File, allowVideo: boolean) {
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  if (!isImage && (!allowVideo || !isVideo)) return 'Please choose a valid status media file';
  if (isImage && file.size > MAX_IMAGE_BYTES) return 'Image is too large (max 15 MB)';
  if (isVideo && file.size > MAX_VIDEO_BYTES) return 'Video is too large (max 100 MB)';
  return null;
}

export function StatusUploadProvider({ children }: { children: React.ReactNode }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const pendingRef = useRef<{ kind: StatusUploadKind; podId?: string } | null>(null);
  const [accept, setAccept] = useState('image/*');
  const [upload, setUpload] = useState<StatusUploadState>(IDLE);
  const [notice, setNotice] = useState<string | null>(null);

  const openProfilePicker = () => {
    if (upload.active) return setNotice('Please wait, status upload is in progress.');
    pendingRef.current = { kind: 'profile' };
    setAccept('image/*');
    inputRef.current?.click();
  };

  const openPodPicker = (podId: string) => {
    if (upload.active) return setNotice('Please wait, status upload is in progress.');
    pendingRef.current = { kind: 'pod', podId };
    setAccept('image/*,video/*');
    inputRef.current?.click();
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (!file || !pending) return;
    const fileError = validateFile(file, pending.kind === 'pod');
    if (fileError) return setNotice(fileError);

    setUpload({ active: true, kind: pending.kind, progress: 8, message: 'Preparing status upload...' });
    try {
      const mediaType = mediaTypeOf(file);
      const fileBase64 = await toBase64(file);
      setUpload((current) => ({ ...current, progress: 45, message: 'Uploading status media...' }));
      const uploaded = await apolloClient.mutate({
        mutation: UPLOAD_STATUS_MEDIA,
        variables: { fileBase64, fileName: file.name, mimeType: file.type, folder: pending.kind === 'pod' ? '/pod-status' : '/posts' },
      });
      const url = uploaded.data?.uploadImageToImagekit?.url;
      if (!url) throw new Error('Upload failed');

      setUpload((current) => ({ ...current, progress: 78, message: 'Saving status...' }));
      if (pending.kind === 'pod') {
        await apolloClient.mutate({ mutation: ADD_POD_STATUS, variables: { podId: pending.podId, media: { url, type: mediaType } } });
      } else {
        await apolloClient.mutate({ mutation: CREATE_STATUS_POST, variables: { input: { image_url: url, caption: '' } } });
      }
      await apolloClient.refetchQueries({ include: ['HomeFeed', 'MeAndMyPosts', 'PodDetails'] });
      setUpload({ active: false, kind: null, progress: 100, message: 'Status uploaded.', profileUrl: pending.kind === 'profile' ? url : upload.profileUrl });
      setNotice('Status uploaded.');
    } catch (error: any) {
      setNotice(error?.message ?? 'Could not upload status');
      setUpload((current) => ({ ...IDLE, profileUrl: current.profileUrl }));
    }
  };

  const value = useMemo(() => ({ upload, openProfilePicker, openPodPicker }), [upload]);

  return (
    <StatusUploadContext.Provider value={value}>
      {children}
      <input ref={inputRef} type="file" accept={accept} hidden onChange={handleFile} />
      {upload.active && (
        <Box sx={{ position: 'fixed', left: 12, right: 12, bottom: 'calc(var(--duncit-bottom-nav-overlay-offset, 88px) + 10px)', zIndex: 1400 }}>
          <Alert severity="info" variant="filled" sx={{ boxShadow: 6 }}>
            <Stack spacing={0.75}>
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                <Typography variant="body2" fontWeight={800}>{upload.message}</Typography>
                <Typography variant="caption" fontWeight={900}>{upload.progress}%</Typography>
              </Stack>
              <LinearProgress variant="determinate" value={upload.progress} color="inherit" />
            </Stack>
          </Alert>
        </Box>
      )}
      <Snackbar open={!!notice} autoHideDuration={3200} onClose={() => setNotice(null)} message={notice ?? ''} action={<Button color="inherit" size="small" onClick={() => setNotice(null)}>OK</Button>} />
    </StatusUploadContext.Provider>
  );
}

export function useStatusUpload() {
  const context = useContext(StatusUploadContext);
  if (!context) throw new Error('useStatusUpload must be used inside StatusUploadProvider');
  return context;
}