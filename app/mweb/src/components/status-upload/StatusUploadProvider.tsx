import { createContext, useContext, useMemo, useRef, useState } from 'react';
import { Alert, Box, Button, LinearProgress, Snackbar, Stack, Typography } from '@mui/material';
import type { CropRect, VideoTrim } from '@duncit/media-picker';
import { apolloClient } from '../../apollo';
import { ADD_POD_STATUS, CREATE_STATUS_POST } from './queries';
import StatusCropDialog from './StatusCropDialog';
import StatusVideoPreviewDialog from './StatusVideoPreviewDialog';
import { mediaTypeOf, uploadStatusMedia, type StatusUploadKind } from './statusPipeline';

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
  openClubPicker: (clubId: string) => void;
}

interface PendingPick {
  kind: StatusUploadKind;
  podId?: string;
  clubId?: string;
}

const StatusUploadContext = createContext<StatusUploadContextValue | null>(null);
const IDLE: StatusUploadState = { active: false, kind: null, progress: 0, message: '' };
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
// Story videos are capped at 50 MB; pod status keeps the general video cap.
const MAX_STORY_VIDEO_BYTES = 50 * 1024 * 1024;

function validateFile(file: File, kind: StatusUploadKind) {
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  if (!isImage && !isVideo) return 'Please choose a valid status media file';
  if (isImage && file.size > MAX_IMAGE_BYTES) return 'Image is too large (max 15 MB)';
  if (isVideo) {
    const cap = kind === 'pod' ? MAX_VIDEO_BYTES : MAX_STORY_VIDEO_BYTES;
    if (file.size > cap) return `Video is too large (max ${Math.round(cap / (1024 * 1024))} MB)`;
  }
  return null;
}

export function StatusUploadProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const pendingRef = useRef<PendingPick | null>(null);
  const [accept, setAccept] = useState('image/*');
  const [upload, setUpload] = useState<StatusUploadState>(IDLE);
  const [notice, setNotice] = useState<string | null>(null);
  // Image picks pause here for the crop step.
  const [cropPick, setCropPick] = useState<{ file: File; pending: PendingPick } | null>(null);
  // Story-video picks pause here for the preview / 15s-trim step.
  const [videoPick, setVideoPick] = useState<{ file: File; pending: PendingPick } | null>(null);

  const openPicker = (pending: PendingPick) => {
    if (upload.active) return setNotice('Please wait, status upload is in progress.');
    pendingRef.current = pending;
    setAccept('image/*,video/*');
    inputRef.current?.click();
  };

  const openProfilePicker = () => openPicker({ kind: 'profile' });
  const openPodPicker = (podId: string) => openPicker({ kind: 'pod', podId });
  const openClubPicker = (clubId: string) => openPicker({ kind: 'club', clubId });

  const runUpload = async (
    file: File,
    pending: PendingPick,
    crop: CropRect | null,
    cropPreset: string | null,
    trim: VideoTrim | null = null,
  ) => {
    const mediaType = mediaTypeOf(file);
    setUpload({ active: true, kind: pending.kind, progress: 0, message: 'Preparing status upload...' });
    try {
      const url = await uploadStatusMedia({
        file,
        kind: pending.kind,
        crop,
        cropPreset,
        trim,
        onStage: (stage) => setUpload((current) => ({ ...current, ...stage })),
      });
      setUpload((current) => ({ ...current, progress: 96, message: 'Saving status...' }));
      if (pending.kind === 'pod') {
        await apolloClient.mutate({ mutation: ADD_POD_STATUS, variables: { podId: pending.podId, media: { url, type: mediaType } } });
      } else {
        await apolloClient.mutate({
          mutation: CREATE_STATUS_POST,
          variables: {
            input: {
              image_url: url,
              caption: '',
              kind: 'STORY',
              media_type: mediaType,
              ...(pending.kind === 'club' ? { club_id: pending.clubId } : {}),
            },
          },
        });
      }
      await apolloClient.refetchQueries({ include: ['HomeFeed', 'MeAndMyPosts', 'PodDetails', 'ClubStories'] });
      setUpload({ active: false, kind: null, progress: 100, message: 'Status uploaded.', profileUrl: pending.kind === 'profile' ? url : upload.profileUrl });
      setNotice('Status uploaded.');
    } catch (error: any) {
      setNotice(error?.message ?? 'Could not upload status');
      setUpload((current) => ({ ...IDLE, profileUrl: current.profileUrl }));
    }
  };

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (!file || !pending) return;
    const fileError = validateFile(file, pending.kind);
    if (fileError) return setNotice(fileError);

    if (mediaTypeOf(file) === 'VIDEO') {
      // Pod status keeps the direct path; story videos pause on the preview
      // step, where clips over 15s must be trimmed before posting (Bug 3).
      if (pending.kind === 'pod') return runUpload(file, pending, null, null);
      return setVideoPick({ file, pending });
    }
    // Images pause on the crop step (admin presets; No Crop default).
    setCropPick({ file, pending });
  };

  const value = useMemo(() => ({ upload, openProfilePicker, openPodPicker, openClubPicker }), [upload]);

  return (
    <StatusUploadContext.Provider value={value}>
      {children}
      <input ref={inputRef} type="file" accept={accept} hidden onChange={handleFile} />
      <StatusCropDialog
        file={cropPick?.file ?? null}
        onCancel={() => setCropPick(null)}
        onConfirm={(crop, cropPreset) => {
          const pick = cropPick;
          setCropPick(null);
          if (pick) runUpload(pick.file, pick.pending, crop, cropPreset);
        }}
      />
      <StatusVideoPreviewDialog
        file={videoPick?.file ?? null}
        onCancel={() => setVideoPick(null)}
        onConfirm={(trim) => {
          const pick = videoPick;
          setVideoPick(null);
          if (pick) runUpload(pick.file, pick.pending, null, null, trim);
        }}
      />
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
