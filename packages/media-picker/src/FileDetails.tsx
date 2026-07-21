import { useEffect, useState } from 'react';
import { Chip, Stack, Typography } from '@mui/material';
import { formatBytes, formatDuration } from './cropUtils';

export interface MediaDimensions {
  width: number;
  height: number;
  /** Seconds — videos only. */
  duration?: number;
}

/**
 * Reads the natural resolution (and duration for videos) of a picked file off
 * its object-URL preview, reporting it up so the crop UI can suggest a preset.
 */
export function useMediaDimensions(
  previewUrl: string | null,
  kind: 'image' | 'video' | 'other',
): MediaDimensions | null {
  const [dims, setDims] = useState<MediaDimensions | null>(null);

  useEffect(() => {
    setDims(null);
    if (!previewUrl || kind === 'other') return;
    if (kind === 'image') {
      const img = new Image();
      img.onload = () => setDims({ width: img.naturalWidth, height: img.naturalHeight });
      img.src = previewUrl;
      return;
    }
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () =>
      setDims({ width: video.videoWidth, height: video.videoHeight, duration: video.duration });
    video.src = previewUrl;
  }, [previewUrl, kind]);

  return dims;
}

interface Props {
  file: File;
  dims: MediaDimensions | null;
}

/** Full details of the picked file: name, type, size, resolution (+duration). */
export default function FileDetails({ file, dims }: Readonly<Props>) {
  const chips: string[] = [file.type || 'unknown type', formatBytes(file.size)];
  if (dims?.width && dims?.height) chips.push(`${dims.width}×${dims.height}px`);
  const duration = dims?.duration ? formatDuration(dims.duration) : '';
  if (duration) chips.push(duration);

  return (
    <Stack spacing={0.75} alignItems="center" sx={{ width: '100%', maxWidth: 480 }}>
      <Typography variant="body2" fontWeight={700} noWrap sx={{ maxWidth: '100%' }}>
        {file.name}
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center" useFlexGap>
        {chips.map((chip) => (
          <Chip key={chip} label={chip} size="small" variant="outlined" />
        ))}
      </Stack>
    </Stack>
  );
}
