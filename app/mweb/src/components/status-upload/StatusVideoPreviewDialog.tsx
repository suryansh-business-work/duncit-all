import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Slider,
  Stack,
  Typography,
} from '@mui/material';
import type { VideoTrim } from '@duncit/media-picker';

/** Story videos are short clips — capped at 15s (Bug 3). */
export const MAX_STORY_VIDEO_SECONDS = 15;

const fmt = (seconds: number) => {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

interface Props {
  file: File | null;
  onCancel: () => void;
  /** `trim` is null when the clip already fits the 15s cap. */
  onConfirm: (trim: VideoTrim | null) => void;
}

/**
 * Preview a picked story video before posting. Clips over the 15s cap get a
 * trim slider: the user slides the 15s window's start point (the server cuts
 * the video during the FFmpeg pass) — only then can they post.
 */
export default function StatusVideoPreviewDialog({ file, onCancel, onConfirm }: Readonly<Props>) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  useEffect(() => {
    setDuration(0);
    setStart(0);
  }, [file]);

  const needsTrim = duration > MAX_STORY_VIDEO_SECONDS;
  const maxStart = Math.max(0, duration - MAX_STORY_VIDEO_SECONDS);
  const windowEnd = Math.min(duration, start + MAX_STORY_VIDEO_SECONDS);

  const handleSeek = (value: number) => {
    setStart(value);
    const video = videoRef.current;
    if (video) video.currentTime = value;
  };
  const confirm = () =>
    onConfirm(needsTrim ? { start, duration: MAX_STORY_VIDEO_SECONDS } : null);

  return (
    <Dialog open={!!file} onClose={onCancel} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 900 }}>Preview your video story</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5}>
          {url && (
            <Box
              component="video"
              ref={videoRef}
              src={url}
              controls
              playsInline
              onLoadedMetadata={(e: React.SyntheticEvent<HTMLVideoElement>) =>
                setDuration(e.currentTarget.duration || 0)
              }
              sx={{ width: '100%', maxHeight: '48vh', borderRadius: 2, bgcolor: 'common.black' }}
            />
          )}
          {needsTrim && (
            <>
              <Alert severity="info">
                Videos can be up to {MAX_STORY_VIDEO_SECONDS} seconds long. Slide to pick the{' '}
                {MAX_STORY_VIDEO_SECONDS}s you want to post.
              </Alert>
              <Slider
                aria-label="Trim start"
                value={start}
                min={0}
                max={maxStart}
                step={0.5}
                onChange={(_e, value) => handleSeek(value as number)}
                valueLabelDisplay="auto"
                valueLabelFormat={fmt}
              />
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                Posting {fmt(start)} – {fmt(windowEnd)} of {fmt(duration)}
              </Typography>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="contained" onClick={confirm} sx={{ fontWeight: 800 }}>
          {needsTrim ? 'Trim & Post' : 'Post story'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
