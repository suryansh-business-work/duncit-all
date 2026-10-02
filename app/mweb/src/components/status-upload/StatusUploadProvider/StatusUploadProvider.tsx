import { useMemo, useRef, useState } from 'react';
import { Snackbar } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useUploadCaps, type CropRect, type VideoTrim } from '@duncit/media-picker';
import { apolloClient } from '../../../apollo';
import { ADD_POD_STATUS, CREATE_STATUS_POST } from '../queries';
import StatusCropDialog from '../StatusCropDialog';
import StatusVideoPreviewDialog from '../StatusVideoPreviewDialog';
import { mediaTypeOf, uploadStatusMedia } from '../statusPipeline';
import { useTranslation } from '../../../i18n/useTranslation';
import { StatusUploadContext } from './context';
import StatusUploadProgress from './StatusUploadProgress';
import type { PendingPick, StatusUploadState } from './types';

const IDLE: StatusUploadState = { active: false, kind: null, progress: 0, message: '' };
/** A status is a photo or a clip; the sizes are the admin's to set. */
const STATUS_MEDIA = { allowImage: true, allowVideo: true, allowDocuments: false };

export function StatusUploadProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const { t } = useTranslation();
  // Asked for on the first picker open rather than on mount: the query needs a
  // signed-in caller and this provider wraps every page, signed out included.
  const [armed, setArmed] = useState(false);
  const caps = useUploadCaps('MWEB', { skip: !armed });
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
    setArmed(true);
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
    setUpload({ active: true, kind: pending.kind, progress: 0, message: t('mweb.statusUpload.preparingStatusUpload') });
    try {
      const url = await uploadStatusMedia({
        file,
        kind: pending.kind,
        crop,
        cropPreset,
        trim,
        onStage: (stage) => setUpload((current) => ({ ...current, ...stage })),
      });
      setUpload((current) => ({ ...current, progress: 96, message: t('mweb.statusUpload.savingStatus') }));
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
      setUpload({ active: false, kind: null, progress: 100, message: t('mweb.statusUpload.statusUploaded'), profileUrl: pending.kind === 'profile' ? url : upload.profileUrl });
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
    const fileError = caps.validate(file, STATUS_MEDIA);
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
      <input
        ref={inputRef}
        data-testid="status-upload-input"
        type="file"
        accept={accept}
        hidden
        onChange={handleFile}
      />
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
      {upload.active && <StatusUploadProgress upload={upload} />}
      <Snackbar
        data-testid="status-upload-notice"
        open={!!notice}
        autoHideDuration={3200}
        onClose={() => setNotice(null)}
        message={notice ?? ''}
        action={
          <DuncitButton data-testid="status-upload-notice-ok" color="inherit" size="small" onClick={() => setNotice(null)}>
            OK
          </DuncitButton>
        }
      />
    </StatusUploadContext.Provider>
  );
}
