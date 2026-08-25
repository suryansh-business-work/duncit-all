import { useEffect, useRef } from 'react';
import { Box, Typography, useTheme } from '@mui/material';

interface Props {
  stream: MediaStream | null;
  label: string;
}

const BAR_WIDTH = 3;
const BAR_GAP = 2;

/**
 * The bar along the bottom of a call.
 *
 * An audio call is otherwise a rectangle with a timer on it — nothing on screen
 * says the line is carrying anything. This answers "can they hear me, are they
 * still there" without anybody saying "hello?" twice.
 *
 * Hand-drawn from an AnalyserNode rather than through `@audiowave/react`, which
 * was tried first and cannot run here: its bundle INLINES React's dev JSX
 * runtime instead of importing `react/jsx-runtime` as an external, so it reads
 * React 19 shared internals (`recentlyCreatedOwnerStacks`) that do not exist in
 * the React 18 these portals are on. It threw on mount and took the whole call
 * panel with it, on 0.6.2 and on 0.5.0 alike. Sixty lines of canvas has no
 * peer-dependency opinion at all.
 */
export default function CallWaveform({ stream, label }: Readonly<Props>) {
  const theme = useTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!stream || !canvas) return;

    const Ctor = globalThis.AudioContext ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;

    const context = new Ctor();
    const analyser = context.createAnalyser();
    // Small FFT: this is a level meter, not a spectrogram, and a big one costs
    // work every frame to draw the same picture.
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.75;
    const source = context.createMediaStreamSource(stream);
    source.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);
    let frame = 0;

    const draw = () => {
      frame = globalThis.requestAnimationFrame(draw);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Match the backing store to the box, or the bars are blurry on a
      // high-DPI screen and off-centre after a resize.
      const ratio = globalThis.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width * ratio || canvas.height !== height * ratio) {
        canvas.width = width * ratio;
        canvas.height = height * ratio;
        ctx.scale(ratio, ratio);
      }

      analyser.getByteFrequencyData(data);
      ctx.clearRect(0, 0, width, height);

      const step = BAR_WIDTH + BAR_GAP;
      const bars = Math.max(1, Math.floor(width / step));
      const perBar = Math.max(1, Math.floor(data.length / bars));
      for (let index = 0; index < bars; index += 1) {
        // Average the bin group so a bar means the band, not one frequency.
        let total = 0;
        for (let offset = 0; offset < perBar; offset += 1) {
          total += data[index * perBar + offset] ?? 0;
        }
        const level = total / perBar / 255;
        const barHeight = Math.max(2, level * height);
        ctx.fillStyle = level > 0.02 ? theme.palette.primary.main : theme.palette.divider;
        const x = index * step;
        const y = (height - barHeight) / 2;
        // Rounded, because a row of hard rectangles reads as a chart.
        ctx.beginPath();
        ctx.roundRect?.(x, y, BAR_WIDTH, barHeight, 2);
        ctx.fill();
      }
    };
    draw();

    return () => {
      globalThis.cancelAnimationFrame(frame);
      source.disconnect();
      analyser.disconnect();
      context.close().catch(() => undefined);
    };
  }, [stream, theme.palette.primary.main, theme.palette.divider]);

  return (
    <Box sx={{ px: 1.5, pb: 1 }}>
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          display: 'block',
          mb: 0.25
        }}>
        {label}
      </Typography>
      <Box
        component="canvas"
        ref={canvasRef}
        aria-hidden
        sx={{ width: '100%', height: 44, display: 'block' }}
      />
    </Box>
  );
}
