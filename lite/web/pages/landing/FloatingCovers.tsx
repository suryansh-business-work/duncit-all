import { Box } from '@mui/material';
import { tint } from '../../../shared/theme';
import { LITE_MOTION, LITE_RADII, tintAt } from '../../../shared/tokens';

/**
 * Where each cover floats around the headline: left/top in % of the hero, a
 * size, a tilt and a phase. Layout, not content — the pictures themselves are
 * the real events' covers. Slots marked `wide` only show from a tablet up so a
 * phone keeps the text clear.
 */
const SLOTS = [
  { left: 6, top: 6, size: 104, tilt: -6, delay: 0, wide: false },
  { left: 21, top: 2, size: 112, tilt: 5, delay: 1.2, wide: true },
  { left: 39, top: -4, size: 120, tilt: -3, delay: 2.1, wide: true },
  { left: 57, top: -2, size: 112, tilt: 4, delay: 0.6, wide: true },
  { left: 74, top: 4, size: 120, tilt: -5, delay: 1.8, wide: false },
  { left: 3, top: 34, size: 84, tilt: 4, delay: 2.6, wide: true },
  { left: 85, top: 30, size: 96, tilt: 6, delay: 0.9, wide: true },
  { left: 11, top: 60, size: 128, tilt: -4, delay: 1.5, wide: true },
  { left: 70, top: 56, size: 112, tilt: 3, delay: 2.9, wide: true },
  { left: 28, top: 78, size: 104, tilt: 5, delay: 0.3, wide: false },
  { left: 55, top: 80, size: 120, tilt: -6, delay: 2.3, wide: false },
  { left: 88, top: 74, size: 96, tilt: -3, delay: 1.1, wide: true },
] as const;

/**
 * The real events' covers drifting around the hero. Decorative (hidden from
 * assistive tech), still under reduced motion, and tinted tiles stand in when
 * there are no covers yet.
 */
export function FloatingCovers({ covers }: Readonly<{ covers: readonly string[] }>) {
  return (
    <Box aria-hidden sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {SLOTS.map((slot, index) => {
        const cover = covers.length > 0 ? covers[index % covers.length] : null;
        return (
          <Box
            key={`${slot.left}-${slot.top}`}
            data-lite-animate
            sx={(theme) => ({
              position: 'absolute',
              left: `${slot.left}%`,
              top: `${slot.top}%`,
              width: { xs: slot.size * 0.62, md: slot.size },
              aspectRatio: '1 / 1',
              display: { xs: slot.wide ? 'none' : 'block', md: 'block' },
              borderRadius: `${LITE_RADII.card}px`,
              overflow: 'hidden',
              border: `4px solid ${theme.vars?.palette.background.paper}`,
              boxShadow: `0 18px 40px ${tint(theme.palette.common.black, 0.45)}`,
              background: cover ? undefined : `linear-gradient(135deg, ${tintAt(index)}, ${tint(tintAt(index + 2), 0.6)})`,
              // The fade's `both` fill starts it at 0; with motion reduced the animation is off and it simply shows.
              '--lite-tilt': `${slot.tilt}deg`,
              animation: `lite-fade 900ms ${slot.delay * 0.2}s both, lite-float ${LITE_MOTION.float}ms ${slot.delay}s ease-in-out infinite`,
              transform: `rotate(${slot.tilt}deg)`,
            })}
          >
            {cover ? <img src={cover} alt="" width={slot.size} height={slot.size} loading="lazy" style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
          </Box>
        );
      })}
    </Box>
  );
}
