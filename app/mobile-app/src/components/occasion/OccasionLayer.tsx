import { StyleSheet, View } from 'react-native';
import { hasOccasionDecoration, isOccasionAnimated } from '@duncit/utils';

import { useAppActive } from '@/hooks/useAppActive';
import type { OccasionLook } from '@/hooks/useOccasionLook';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { OccasionBoundary } from './OccasionBoundary';
import { OccasionEffects } from './OccasionEffects';
import { OccasionGreeting } from './OccasionGreeting';
import { OccasionPauseButton } from './OccasionPauseButton';
import { useOccasionPaused } from './occasion-prefs';

export interface OccasionLayerProps {
  /** The live look; null (the house look) draws nothing. */
  look: OccasionLook | null;
  /** Whether the greeting may show yet — not while the boot splash still covers the app. */
  greet: boolean;
}

function LookLayer({ look, greet }: Readonly<{ look: OccasionLook; greet: boolean }>) {
  const reduceMotion = useReduceMotion();
  const appActive = useAppActive();
  const { paused, toggle } = useOccasionPaused(look.key);
  // Reduce Motion shows the decoration still, so there is nothing to pause.
  const animated = !reduceMotion && isOccasionAnimated(look);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {hasOccasionDecoration(look) ? (
        <OccasionEffects decoration={look} running={animated && appActive && paused === false} />
      ) : null}
      {animated && paused !== null ? (
        <OccasionPauseButton paused={paused} onToggle={toggle} />
      ) : null}
      {greet ? (
        <OccasionGreeting lookKey={look.key} text={look.greeting} reduceMotion={reduceMotion} />
      ) : null}
    </View>
  );
}

/**
 * Everything a festive look puts over the app, mounted once above the
 * navigator: its decoration, the pause control (the choice remembered per
 * look) and its greeting once a launch. A crash in here is logged and the
 * decoration disappears; the app carries on.
 */
export function OccasionLayer({ look, greet }: Readonly<OccasionLayerProps>) {
  if (!look) return null;
  return (
    <OccasionBoundary key={look.key}>
      <LookLayer look={look} greet={greet} />
    </OccasionBoundary>
  );
}
