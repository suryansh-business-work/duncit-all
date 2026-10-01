import type { CSSProperties } from 'react';
import { AbsoluteFill, Img, Sequence, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Video } from '@remotion/media';
import type { ReelAsset, ReelCorner, ReelOverlay, ReelScene } from '@duncit/gql-types';
import { motionTransform } from './motion';
import { TextLayer } from './TextLayer';
import { msToFrames, windowFrames } from './timing';

export type AssetLookup = ReadonlyMap<string, ReelAsset>;

const FILL: CSSProperties = { width: '100%', height: '100%' };

/** Where an overlay sits. The insets match the text bands, so a logo never lands under the reel's own buttons. */
const CORNER: Record<ReelCorner, CSSProperties> = {
  TOP_LEFT: { top: '6%', left: '6%' },
  TOP_RIGHT: { top: '6%', right: '6%' },
  BOTTOM_LEFT: { bottom: '10%', left: '6%' },
  BOTTOM_RIGHT: { bottom: '10%', right: '6%' },
  CENTER: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
};

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
}

/** One scene: its background, its footage with the scene's drift, then overlays and text on top. */
export function SceneLayer({ scene, frames, assets }: Readonly<Props>) {
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
      {scene.texts.map((text) => (
        <Sequence key={text.id} layout="none" {...windowFrames(text.start_ms, text.duration_ms, frames, fps)}>
          <TextLayer text={text} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}
