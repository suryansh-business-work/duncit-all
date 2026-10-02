import { Box } from '@mui/material';
import StatusSlideVideo from '../StatusSlideVideo';

interface StatusViewerMediaProps {
  videoSrc?: string | null;
  index: number;
  held: boolean;
  muted: boolean;
  onBlocked: () => void;
  onTimeUpdate: (event: React.SyntheticEvent<HTMLVideoElement>) => void;
  onEnded: () => void;
  onError: () => void;
  mediaUrl?: string | null;
  label: string;
}

/** The shown slide: its clip, its image, or an empty placeholder. */
export default function StatusViewerMedia({
  videoSrc,
  index,
  held,
  muted,
  onBlocked,
  onTimeUpdate,
  onEnded,
  onError,
  mediaUrl,
  label,
}: Readonly<StatusViewerMediaProps>) {
  if (videoSrc) {
    return (
      <StatusSlideVideo
        key={`video-${index}`}
        src={videoSrc}
        paused={held}
        muted={muted}
        onBlocked={onBlocked}
        onTimeUpdate={onTimeUpdate}
        onEnded={onEnded}
        onError={onError}
      />
    );
  }
  return mediaUrl ? (
    <Box component="img" src={mediaUrl} alt={label} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
  ) : (
    <Box sx={{ width: '100%', height: '100%' }} />
  );
}
