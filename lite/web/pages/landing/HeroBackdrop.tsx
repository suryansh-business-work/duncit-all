import { useEffect, useRef } from 'react';
import { useReducedMotion, type MotionValue } from 'framer-motion';
import { Box } from '@mui/material';
import { useColorScheme } from '@mui/material/styles';
import { HEADLINE_GRADIENT, HEADLINE_GRADIENT_LIGHT, tintAt } from '../../../shared/tokens';
import { liteLog } from '../../lib/log';

/** The three.js scene is ~150 KB: only a browser that can draw it downloads it, after the page is up. */
const canDraw = (): boolean => typeof globalThis.window !== 'undefined' && 'WebGLRenderingContext' in globalThis.window;

/**
 * The hero's 3D layer behind the covers and the headline. Decorative (hidden
 * from assistive tech); under reduced motion it draws one still frame; on a
 * phone it draws less. Without WebGL the page keeps its flat background.
 */
export function HeroBackdrop({ scroll }: Readonly<{ scroll: MotionValue<number> }>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduceMotion = Boolean(useReducedMotion());
  const { mode, systemMode } = useColorScheme();
  const dark = (mode === 'system' ? systemMode : mode) !== 'light';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canDraw()) return undefined;
    let teardown: (() => void) | null = null;
    let live = true;
    const compact = globalThis.matchMedia?.('(max-width: 600px)').matches ?? false;
    const [from, to] = dark ? HEADLINE_GRADIENT : HEADLINE_GRADIENT_LIGHT;
    import('./scene/heroScene')
      .then(({ mountHeroScene }) => {
        if (live) teardown = mountHeroScene(canvas, { colors: [from, to, tintAt(2)], dark, compact, animate: !reduceMotion, scroll: () => scroll.get() });
      })
      .catch((error: unknown) => liteLog.warn('landing', 'HeroBackdrop', { error, message: 'The 3D hero could not start; the flat background stays.' }));
    return () => {
      live = false;
      teardown?.();
    };
  }, [dark, reduceMotion, scroll]);

  return (
    <Box aria-hidden sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <Box component="canvas" ref={canvasRef} sx={{ display: 'block', width: '100%', height: '100%' }} data-testid="landing-hero-canvas" />
    </Box>
  );
}
