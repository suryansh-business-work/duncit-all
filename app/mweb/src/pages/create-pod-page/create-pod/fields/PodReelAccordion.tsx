import { useRef, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  CircularProgress,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MovieOutlinedIcon from '@mui/icons-material/MovieOutlined';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useApolloClient } from '@apollo/client';
import { compressUploadedVideo, useImagekitDirectUpload } from '@duncit/media-picker';
import type { CreatePodForm } from '../create-pod.types';

const REEL_MAX_BYTES = 100 * 1024 * 1024; // Reel videos are capped at 100 MB.
const VIDEO_URL_RE = /\.(mp4|mov|webm)$/i;

const isVideoFile = (file: File) =>
  file.type.startsWith('video/') || VIDEO_URL_RE.test(file.name);

interface Props {
  form: CreatePodForm;
}

/** Step 1 "Pod Reel" accordion — an optional short video uploaded DIRECTLY to
 * ImageKit (folder /pods/reels); it plays in Explore while the pod is live. */
export default function PodReelAccordion({ form }: Readonly<Props>) {
  const [error, setError] = useState<string | null>(null);
  const [pct, setPct] = useState<number | null>(null);
  const [stage, setStage] = useState<'Uploading' | 'Compressing'>('Uploading');
  const client = useApolloClient();
  const { upload, uploading } = useImagekitDirectUpload();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const reelUrl = form.watch('reel_url');
  const hasReel = !!reelUrl;

  const pickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!isVideoFile(file)) {
      setError('Please pick a video file (MP4, MOV or WebM)');
      return;
    }
    if (file.size > REEL_MAX_BYTES) {
      setError('Video is too large (max 100 MB)');
      return;
    }
    setError(null);
    setStage('Uploading');
    setPct(0);
    try {
      // Real byte progress, then the server-side FFmpeg pass (no-op when the
      // admin has video compression off) with its real percentage too.
      const rawUrl = await upload(file, '/pods/reels', setPct);
      setStage('Compressing');
      setPct(0);
      const url = await compressUploadedVideo(client, rawUrl, '/pods/reels', 'MWEB', setPct);
      if (url) form.setValue('reel_url', url, { shouldDirty: true });
    } catch (err: any) {
      setError(err?.message || 'Upload failed');
    } finally {
      setPct(null);
    }
  };

  const removeReel = () => form.setValue('reel_url', '', { shouldDirty: true });

  const busy = uploading || pct !== null;
  let uploadLabel = hasReel ? 'Replace video' : 'Upload video';
  if (busy) uploadLabel = `${stage}…`;

  return (
    <Accordion
      disableGutters
      square
      sx={{
        '&:before': { display: 'none' },
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1.5,
        overflow: 'hidden',
        boxShadow: 'none',
        bgcolor: 'background.paper',
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{ minHeight: 56 }}
        aria-controls="pod-reel-content"
        id="pod-reel-header"
      >
        <Stack direction="row" alignItems="center" spacing={1.25} sx={{ flex: 1 }}>
          <MovieOutlinedIcon color="primary" fontSize="small" />
          <Typography variant="subtitle2" fontWeight={900}>Pod Reel</Typography>
          {hasReel && <Chip label="Added" size="small" color="primary" />}
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1.25}>
          <Typography variant="caption" color="text.secondary">
            Reel video shows in Explore while this pod is live. Optional — one video up to 100 MB.
          </Typography>
          {hasReel && (
            <Box
              component="video"
              src={reelUrl}
              controls
              playsInline
              sx={{ width: '100%', maxHeight: 320, borderRadius: 2, bgcolor: 'common.black' }}
            />
          )}
          {error && (
            <Chip
              size="small"
              color="error"
              label={error}
              onDelete={() => setError(null)}
              sx={{ alignSelf: 'flex-start' }}
            />
          )}
          {pct !== null && (
            <Box>
              <LinearProgress variant="determinate" value={pct} />
              <Typography variant="caption" color="text.secondary">
                {stage}… {pct}%
              </Typography>
            </Box>
          )}
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              startIcon={busy ? <CircularProgress size={16} /> : <VideocamOutlinedIcon />}
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              {uploadLabel}
            </Button>
            {hasReel && !busy && (
              <Button size="small" color="error" startIcon={<DeleteOutlineIcon />} onClick={removeReel}>
                Remove
              </Button>
            )}
          </Stack>
          <input ref={fileRef} type="file" accept="video/*" hidden onChange={pickFile} />
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
