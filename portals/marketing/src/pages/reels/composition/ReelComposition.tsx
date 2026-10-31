import { useMemo, type ReactElement } from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { Audio } from '@remotion/media';
import { TransitionSeries, linearTiming, type TransitionPresentation } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import type { ReelAsset, ReelSpec, ReelTransition } from '@duncit/gql-types';
import { SceneLayer, type AssetLookup } from './SceneLayer';
import { msToFrames, sceneTimings, type SceneTiming } from './timing';

/**
 * The reel, drawn from its spec.
 *
 * This component is the ONLY thing that turns a spec into pictures: the player
 * mounts it for the live preview and the exporter renders the same component
 * frame by frame, so the two cannot drift. It reads nothing but its props —
 * no queries, no context — which is what lets it run outside the page.
 */
export interface ReelCompositionProps extends Record<string, unknown> {
  spec: ReelSpec;
  assets: readonly ReelAsset[];
}

type AnyPresentation = TransitionPresentation<Record<string, unknown>>;

/** How each kind of arrival is drawn. A cut has no presentation — it is the absence of one. */
const PRESENTATIONS: Record<Exclude<ReelTransition, 'NONE'>, () => AnyPresentation> = {
  FADE: () => fade() as AnyPresentation,
  SLIDE: () => slide({ direction: 'from-right' }) as AnyPresentation,
  WIPE: () => wipe({ direction: 'from-left' }) as AnyPresentation,
};

/** A scene and, when it does not simply cut in, the transition that brings it. */
function sceneElements({ scene, frames, transitionFrames }: SceneTiming, assets: AssetLookup): ReactElement[] {
  const elements: ReactElement[] = [];
  if (scene.transition !== 'NONE' && transitionFrames > 0) {
    elements.push(
      <TransitionSeries.Transition
        key={`${scene.id}-in`}
        presentation={PRESENTATIONS[scene.transition]()}
        timing={linearTiming({ durationInFrames: transitionFrames })}
      />
    );
  }
  elements.push(
    <TransitionSeries.Sequence key={scene.id} durationInFrames={frames}>
      <SceneLayer scene={scene} frames={frames} assets={assets} />
    </TransitionSeries.Sequence>
  );
  return elements;
}

export function ReelComposition({ spec, assets }: Readonly<ReelCompositionProps>) {
  const { fps } = useVideoConfig();
  const byId = useMemo<AssetLookup>(() => new Map(assets.map((asset) => [asset.id, asset])), [assets]);
  const timings = useMemo(() => sceneTimings(spec), [spec]);
  const music = spec.music ? byId.get(spec.music.asset_id) : undefined;

  return (
    <AbsoluteFill style={{ backgroundColor: spec.background }}>
      <TransitionSeries>{timings.flatMap((timing) => sceneElements(timing, byId))}</TransitionSeries>
      {spec.music && music && (
        <Audio
          src={music.url}
          trimBefore={msToFrames(spec.music.trim_start_ms, fps)}
          volume={spec.music.volume}
          loop
        />
      )}
    </AbsoluteFill>
  );
}
