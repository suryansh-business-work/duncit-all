import { useEffect, useRef, useState } from 'react';
import { Box, Button, IconButton, Stack, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  url: string;
  /** Bars sampled while it was recorded, 0–1. Empty draws a flat line. */
  peaks: number[];
  seconds: number;
}

/** What the speed button cycles through. 2× is where speech stops being words. */
const SPEEDS = [1, 1.5, 2] as const;

const clock = (value: number) => {
  const total = Math.max(0, Math.round(value));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/**
 * Play a voice note, with the shape of it.
 *
 * The bars are not decoration: they are how you find the part you want without
 * scrubbing blind through somebody's silence. Played-through bars are filled,
 * and clicking one seeks there.
 */
export default function VoiceNotePlayer({ url, peaks, seconds }: Readonly<Props>) {
  const { t } = useTranslation();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [at, setAt] = useState(0);
  // The INDEX, not the value: cycling by value means searching the list for
  // where you are, and a float that came back from the audio element would not
  // be found in it.
  const [speedIndex, setSpeedIndex] = useState(0);
  const speed = SPEEDS[speedIndex];

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  const total = seconds || audioRef.current?.duration || 0;
  const progress = total > 0 ? at / total : 0;
  const bars = peaks.length > 0 ? peaks : new Array(24).fill(0.25);

  const toggle = () => {
    const node = audioRef.current;
    if (!node) return;
    if (node.paused) {
      node.play().catch(() => undefined);
    } else {
      node.pause();
    }
  };

  const seekTo = (fraction: number) => {
    const node = audioRef.current;
    if (!node || !total) return;
    node.currentTime = fraction * total;
    setAt(node.currentTime);
  };

  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 220 }}>
      <Box
        component="audio"
        ref={audioRef}
        src={url}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setAt(0);
        }}
        onTimeUpdate={(event) => setAt((event.target as HTMLAudioElement).currentTime)}
        sx={{ display: 'none' }}
      />

      <IconButton
        size="small"
        onClick={toggle}
        aria-label={t(playing ? 'shell.chat.voice.pause' : 'shell.chat.voice.play')}
      >
        {playing ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
      </IconButton>

      <Stack
        direction="row"
        spacing="2px"
        alignItems="center"
        sx={{ flex: 1, height: 28, cursor: 'pointer' }}
        onClick={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          seekTo(Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)));
        }}
      >
        {bars.map((peak, index) => (
          <Box
            // The bars come from one immutable array whose order is the audio's
            // own order — nothing can reorder between renders.
            key={`bar-${index}`}
            sx={{
              flex: 1,
              minWidth: 2,
              borderRadius: 1,
              height: `${Math.max(12, peak * 100)}%`,
              bgcolor: index / bars.length <= progress ? 'primary.main' : 'action.disabled',
            }}
          />
        ))}
      </Stack>

      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 34 }}>
        {clock(playing || at > 0 ? total - at : total)}
      </Typography>

      <Button
        size="small"
        onClick={() => setSpeedIndex((index) => (index + 1) % SPEEDS.length)}
        sx={{ minWidth: 40, px: 0.5 }}
        aria-label={t('shell.chat.voice.speed', { vars: { rate: String(speed) } })}
      >
        {speed}×
      </Button>
    </Stack>
  );
}
