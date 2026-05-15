import { useRef, useState } from 'react';
import { useMutation } from '@apollo/client';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import HomeStatusTile from './HomeStatusTile';
import { UPLOAD_IMAGE } from '../../components/media-picker-dialog/queries';
import { CREATE_POST } from '../profile-page/queries';

interface Props {
  me?: any;
  onUploaded?: (url: string) => void;
  onError?: (msg: string) => void;
  onView?: (url: string) => void;
}

const MAX_BYTES = 15 * 1024 * 1024;

function initials(name?: string | null) {
  return (name ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export default function MyStatusUploadTile({ me, onUploaded, onError, onView }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusUrl, setStatusUrl] = useState<string | null>(null);
  const [uploadImageMut] = useMutation(UPLOAD_IMAGE);
  const [createPost] = useMutation(CREATE_POST);

  const handlePick = () => {
    if (uploading) return;
    if (statusUrl && onView) {
      onView(statusUrl);
      return;
    }
    inputRef.current?.click();
  };

  const openPicker = () => {
    if (uploading) return;
    inputRef.current?.click();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onError?.('Please choose an image file');
      return;
    }
    if (file.size > MAX_BYTES) {
      onError?.('Image is too large (max 15 MB)');
      return;
    }
    setUploading(true);
    setProgress(15);
    try {
      const fileBase64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Could not read file'));
        reader.readAsDataURL(file);
      });
      setProgress(55);
      const res = await uploadImageMut({
        variables: { fileBase64, fileName: file.name, mimeType: file.type, folder: '/posts' },
      });
      const url = res.data?.uploadImageToImagekit?.url;
      if (!url) throw new Error('Upload failed');
      setProgress(85);
      await createPost({ variables: { input: { image_url: url, caption: '' } } });
      setProgress(100);
      setStatusUrl(url);
      onUploaded?.(url);
    } catch (err: any) {
      onError?.(err?.message ?? 'Could not upload status');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <Stack alignItems="center" sx={{ position: 'relative' }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleFile}
      />
      <HomeStatusTile
        label={uploading ? 'Uploading…' : statusUrl ? 'My status' : 'My status'}
        imageUrl={statusUrl ?? me?.profile_photo}
        initials={initials(me?.full_name || me?.first_name)}
        add={!statusUrl}
        active={!!statusUrl}
        onClick={handlePick}
      />
      {statusUrl && !uploading && (
        <Box
          onClick={(e) => {
            e.stopPropagation();
            openPicker();
          }}
          sx={{
            position: 'absolute',
            right: 4,
            bottom: 18,
            width: 22,
            height: 22,
            borderRadius: '50%',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            border: 2,
            borderColor: 'background.paper',
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 900,
            lineHeight: 1,
          }}
          aria-label="Add another"
        >
          +
        </Box>
      )}
      {uploading && (
        <Box
          sx={{
            position: 'absolute',
            top: 4,
            left: 4,
            width: 62,
            height: 62,
            display: 'grid',
            placeItems: 'center',
            pointerEvents: 'none',
          }}
        >
          <CircularProgress
            variant={progress > 0 ? 'determinate' : 'indeterminate'}
            value={progress}
            size={62}
            thickness={3}
            sx={{ color: 'primary.main' }}
          />
          <Typography
            variant="caption"
            sx={{ position: 'absolute', fontWeight: 700, color: 'primary.main' }}
          >
            {progress}%
          </Typography>
        </Box>
      )}
    </Stack>
  );
}
