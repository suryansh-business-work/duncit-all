import { lazy, Suspense } from 'react';
import { Box } from '@mui/material';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';

import { useColorMode } from '../../app/providers/ColorModeProvider';
import { useBrowserState } from '../../lib/hydration';
import { useStoreT } from '../../i18n';
import { DESKTOP_UP, STORE_TOKENS as T } from '../../theme/tokens';
import { CircleButton } from '../CircleButton';
import { useOccasion } from './occasionContext';

/** The canvas and its loop ship in their own chunk: nobody without a live animation downloads them. */
const FestiveCanvas = lazy(async () => ({ default: (await import('./FestiveCanvas')).FestiveCanvas }));

/**
 * The pause control WCAG 2.2.2 asks for: anything moving longer than five
 * seconds can be stopped. A toggle (`aria-pressed` says "paused"), kept on
 * screen while paused so the celebration can be played again. It sits
 * bottom-left, clear of the phone's bottom navigation.
 */
function PauseCelebration({ playing }: Readonly<{ playing: boolean }>) {
  const { t } = useStoreT();
  const { setPrefs } = useColorMode();
  return (
    <Box
      sx={{
        position: 'fixed',
        left: (theme) => theme.spacing(2),
        bottom: { xs: 'calc(88px + env(safe-area-inset-bottom))', [DESKTOP_UP]: 24 },
        zIndex: (theme) => theme.zIndex.speedDial,
      }}
    >
      <CircleButton
        aria-label={t('ecommStore.festive.pause')}
        aria-pressed={!playing}
        onClick={() => setPrefs({ festiveEffects: !playing })}
        sx={{ boxShadow: T.shadow }}
      >
        {playing ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}
      </CircleButton>
    </Box>
  );
}

/**
 * The occasion's animation layer, mounted once by the occasion provider. It
 * renders nothing unless the look has an animation that may play here (effects
 * on for the occasion or a preview, and no reduced-motion request); the
 * shopper's pause keeps the button but drops the canvas.
 */
export function FestiveLayer() {
  const { look, canAnimate, effectsOn } = useOccasion();
  // Animation only ever runs in a browser, so it is never part of the server's HTML.
  const [inBrowser] = useBrowserState(() => true, false);
  if (!inBrowser || !look || !canAnimate) return null;
  return (
    <>
      {effectsOn ? (
        <Suspense fallback={null}>
          <FestiveCanvas effect={look.effect} />
        </Suspense>
      ) : null}
      <PauseCelebration playing={effectsOn} />
    </>
  );
}
