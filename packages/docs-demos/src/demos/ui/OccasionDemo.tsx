import { Box } from '@mui/material';
import { OccasionEffects } from '@duncit/ui';
import type { OccasionDecoration } from '@duncit/utils';

export interface OccasionMock {
  /** Pause the canvas on one instant instead of animating. */
  still: boolean;
  decoration: OccasionDecoration;
}

/** Christmas as it ships: layered snow, Santa with his sparkle trail, fairy lights and a frosty glow. */
export const CHRISTMAS_MOCK: OccasionMock = {
  still: false,
  decoration: {
    particles: [
      { shapes: ['SNOWFLAKE'], custom_paths: [], colors: ['#FFFFFF', '#CFE6FA', '#9CC9F0'], motion: 'FALL', count: 60, size_min: 7, size_max: 18, speed: 42, opacity: 0.95 },
      { shapes: ['CIRCLE'], custom_paths: [], colors: ['#FFFFFF', '#BBDEFB'], motion: 'FALL', count: 50, size_min: 2, size_max: 5, speed: 30, opacity: 0.85 },
    ],
    flyers: [
      {
        artwork: 'SANTA_SLEIGH',
        custom_layers: [],
        image_url: '',
        direction: 'LTR',
        altitude_min: 12,
        altitude_max: 30,
        size: 200,
        duration: 9,
        interval: 14,
        bob: 9,
        trail_color: '#FFD54F',
      },
    ],
    fireworks: { enabled: false, colors: [], bursts_per_minute: 12, sparks: 28, radius: 90 },
    overlays: [{ style: 'GLOW_TOP', color: '#BFE3FF', opacity: 0.12 }],
    garland: { style: 'STRING_LIGHTS', colors: ['#FF5252', '#FFD740', '#69F0AE', '#40C4FF'] },
  },
};

/**
 * The look inside a phone-sized frame — `contained` sizes the canvas to its
 * positioned parent, exactly how the Marketing portal previews a look. Edit the
 * mock: swap SANTA_SLEIGH for WITCH_BROOM, set `garland.style` to SPIDER_WEB,
 * switch fireworks on.
 */
export function OccasionDemo({ mock }: Readonly<{ mock: OccasionMock }>) {
  return (
    <Box
      sx={{
        position: 'relative',
        width: 360,
        maxWidth: '100%',
        height: 560,
        borderRadius: 4,
        overflow: 'hidden',
        bgcolor: 'grey.900',
        border: 1,
        borderColor: 'divider',
      }}
    >
      <OccasionEffects decoration={mock.decoration} contained still={mock.still} stillAt={4} />
    </Box>
  );
}
