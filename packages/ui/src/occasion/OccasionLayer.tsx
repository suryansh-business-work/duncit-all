import { useEffect, useState } from 'react';
import { IconButton } from '@mui/material';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import { hasOccasionDecoration, isOccasionAnimated, type OccasionDesign } from '@duncit/utils';
import { useTranslation } from '../i18n/useTranslation';
import { OccasionBoundary } from './OccasionBoundary';
import { OccasionEffects } from './OccasionEffects';
import { OccasionGreeting } from './OccasionGreeting';

export interface OccasionLayerProps {
  design: OccasionDesign;
  /** Lifts the pause button clear of a bottom navigation bar, in px. */
  bottomOffset?: number;
  /** The host's logger: a crash in the decoration, or storage the browser refused. */
  onError: (error: unknown, where: string) => void;
}

const PAUSE_KEY = 'duncit_occasion_paused';
const GREETED_KEY = 'duncit_occasion_greeted';
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

type StorageName = 'localStorage' | 'sessionStorage';

/** A remembered yes/no. Storage can be blocked (private mode); then the choice lasts this visit only. */
function readFlag(name: StorageName, key: string, onError: OccasionLayerProps['onError']): boolean {
  try {
    return globalThis[name].getItem(key) === '1';
  } catch (error) {
    onError(error, 'storage');
    return false;
  }
}

function writeFlag(name: StorageName, key: string, on: boolean, onError: OccasionLayerProps['onError']) {
  try {
    if (on) globalThis[name].setItem(key, '1');
    else globalThis[name].removeItem(key);
  } catch (error) {
    onError(error, 'storage');
  }
}

/** The viewer's reduced-motion request, followed live. */
function usePrefersReducedMotion(): boolean {
  const [query] = useState(() => globalThis.matchMedia?.(REDUCED_MOTION));
  const [reduced, setReduced] = useState(query?.matches === true);
  useEffect(() => {
    if (!query) return undefined;
    const follow = () => setReduced(query.matches);
    query.addEventListener('change', follow);
    return () => query.removeEventListener('change', follow);
  }, [query]);
  return reduced;
}

/**
 * Everything a look puts over the app: its decoration, the pause control WCAG
 * 2.2.2 owes anything that moves for more than five seconds (the choice is
 * remembered per look), and its greeting once a session. Reduced motion shows
 * the decoration still, with nothing to pause. A crash in here is logged and
 * the decoration disappears; the page carries on.
 */
export function OccasionLayer(props: Readonly<OccasionLayerProps>) {
  // Keyed by the look, so a new festival starts with its own remembered pause and greeting.
  return <LookLayer key={props.design.key} {...props} />;
}

function LookLayer({ design, bottomOffset = 24, onError }: Readonly<OccasionLayerProps>) {
  const { t } = useTranslation();
  const reduced = usePrefersReducedMotion();
  const pauseKey = `${PAUSE_KEY}:${design.key}`;
  const greetedKey = `${GREETED_KEY}:${design.key}`;
  const [paused, setPaused] = useState(() => readFlag('localStorage', pauseKey, onError));
  const [greeted, setGreeted] = useState(() => readFlag('sessionStorage', greetedKey, onError));
  const animated = isOccasionAnimated(design) && !reduced;
  const greeting = design.greeting.trim();

  const togglePause = () => {
    writeFlag('localStorage', pauseKey, !paused, onError);
    setPaused(!paused);
  };
  const closeGreeting = () => {
    writeFlag('sessionStorage', greetedKey, true, onError);
    setGreeted(true);
  };

  return (
    <OccasionBoundary onError={(error) => onError(error, 'render')}>
      {hasOccasionDecoration(design) && <OccasionEffects decoration={design} still={paused || reduced} />}
      {animated && (
        <IconButton
          aria-label={t(paused ? 'ui.occasion.play' : 'ui.occasion.pause')}
          aria-pressed={paused}
          onClick={togglePause}
          data-testid="occasion-pause"
          sx={{
            position: 'fixed',
            left: 16,
            bottom: `calc(${bottomOffset}px + env(safe-area-inset-bottom, 0px))`,
            zIndex: (theme) => theme.zIndex.speedDial,
            width: 40,
            height: 40,
            bgcolor: 'background.paper',
            color: 'text.primary',
            boxShadow: 3,
            opacity: 0.9,
            '&:hover': { bgcolor: 'background.paper', opacity: 1 },
          }}
        >
          {paused ? <PlayArrowRoundedIcon /> : <PauseRoundedIcon />}
        </IconButton>
      )}
      {greeting && !greeted && <OccasionGreeting text={greeting} instant={reduced} onClose={closeGreeting} />}
    </OccasionBoundary>
  );
}
