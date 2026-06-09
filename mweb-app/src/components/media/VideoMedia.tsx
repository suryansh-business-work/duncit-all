import { useRef, useState } from 'react';
import { Box, IconButton } from '@mui/material';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';

interface Props {
  src: string;
  height?: number | { xs?: number; sm?: number; md?: number; lg?: number };
  poster?: string;
  showToggles?: boolean;
}

/**
 * Auto-playing, muted, looping inline video tile with floating
 * mute and play/pause toggles overlayed at the top.
 */
export default function VideoMedia({
  src,
  height = { xs: 220, md: 360 },
  poster,
  showToggles = true,
}: Readonly<Props>) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);

  const togglePlay = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => undefined);
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const toggleMute = () => {
    const v = ref.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  return (
    <Box sx={{ position: 'relative', width: '100%', bgcolor: 'black' }}>
      <Box
        component="video"
        ref={ref}
        src={src}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        sx={{
          width: '100%',
          height,
          objectFit: 'cover',
          display: 'block',
          bgcolor: 'black',
        }}
      />
      {showToggles && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            display: 'flex',
            gap: 0.5,
            zIndex: 3,
          }}
        >
          <IconButton
            size="small"
            onClick={togglePlay}
            aria-label={playing ? 'Pause video' : 'Play video'}
            sx={{
              bgcolor: 'rgba(0,0,0,0.55)',
              color: 'common.white',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' },
            }}
          >
            {playing ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
          </IconButton>
          <IconButton
            size="small"
            onClick={toggleMute}
            aria-label={muted ? 'Unmute video' : 'Mute video'}
            sx={{
              bgcolor: 'rgba(0,0,0,0.55)',
              color: 'common.white',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' },
            }}
          >
            {muted ? <VolumeOffIcon fontSize="small" /> : <VolumeUpIcon fontSize="small" />}
          </IconButton>
        </Box>
      )}
    </Box>
  );
}
