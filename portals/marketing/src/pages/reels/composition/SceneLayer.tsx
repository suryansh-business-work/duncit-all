import type { CSSProperties } from 'react';
import { AbsoluteFill, Img, Sequence, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Video } from '@remotion/media';
import type { ReelAsset, ReelCaptionStyle, ReelOverlay, ReelScene } from '../types';
import { CORNER } from './corners';
import { motionTransform } from './motion';
import { TextLayer } from './TextLayer';
import { msToFrames, windowFrames } from './timing';

export type AssetLookup = ReadonlyMap<string, ReelAsset>;

/** What every scene draws its words with: the reel's caption style and brand colour. */
export interface SceneLook {
  captions: ReelCaptionStyle;
  /** The brand's primary colour; empty for none. */
  accent: string;
}

const FILL: CSSProperties = { width: '100%', height: '100%' };

/**
 * The clip or picture a scene shows.
 *
 * `crossOrigin` is set on pictures because the exporter draws every frame onto
 * a canvas, and a canvas that has drawn a picture fetched without CORS can no
 * longer be read back. The video goes through `@remotion/media`, which fetches
 * and decodes the file itself — the same path in the player and in the export.
 */
function SceneMedia({ scene, asset }: Readonly<{ scene: ReelScene; asset: ReelAsset }>) {
  const { fps } = useVideoConfig();
  const objectFit = scene.fit === 'CONTAIN' ? 'contain' : 'cover';
  if (asset.kind === 'VIDEO') {
    return (
      <Video
        src={asset.url}
        trimBefore={msToFrames(scene.trim_start_ms, fps)}
        volume={scene.volume}
        muted={scene.volume === 0}
        playbackRate={scene.playback_rate}
        objectFit={objectFit}
        style={FILL}
      />
    );
  }
  return <Img src={asset.url} crossOrigin="anonymous" alt="" style={{ ...FILL, objectFit }} />;
}

function OverlayLayer({ overlay, asset }: Readonly<{ overlay: ReelOverlay; asset: ReelAsset }>) {
  return (
    <Img
      src={asset.url}
      crossOrigin="anonymous"
      alt=""
      style={{ position: 'absolute', width: `${overlay.width_pct}%`, opacity: overlay.opacity, ...CORNER[overlay.corner] }}
    />
  );
}

interface Props {
  scene: ReelScene;
  /** How long the scene is on screen. */
  frames: number;
  assets: AssetLookup;
  look: SceneLook;
}

/** One scene: its background, its footage with the scene's drift, then overlays and text on top. */
export function SceneLayer({ scene, frames, assets, look }: Readonly<Props>) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const asset = assets.get(scene.asset_id);
  const progress = interpolate(frame, [0, Math.max(1, frames - 1)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: scene.background, overflow: 'hidden' }}>
      {asset && (
        <AbsoluteFill style={{ transform: motionTransform(scene.motion, progress) }}>
          <SceneMedia scene={scene} asset={asset} />
        </AbsoluteFill>
      )}
      {scene.overlays.map((overlay) => {
        const picture = assets.get(overlay.asset_id);
        if (!picture) return null;
        return (
          <Sequence key={overlay.id} layout="none" {...windowFrames(overlay.start_ms, overlay.duration_ms, frames, fps)}>
            <OverlayLayer overlay={overlay} asset={picture} />
          </Sequence>
        );
      })}
      {scene.texts.map((text) => {
        const window = windowFrames(text.start_ms, text.duration_ms, frames, fps);
        return (
          <Sequence key={text.id} layout="none" {...window}>
            <TextLayer text={text} frames={window.durationInFrames} captions={look.captions} accent={look.accent} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}
