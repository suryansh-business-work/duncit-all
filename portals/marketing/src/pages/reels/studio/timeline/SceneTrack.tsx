import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { SceneSpan } from '../../editor/layout';
import { REEL_EDIT_LIMITS } from '../../editor/limits';
import { formatReelDuration } from '../../format';
import type { ReelAsset, ReelScene } from '../../types';
import MediaThumb from '../MediaThumb';
import { clamp, msToPx, SCENE_ROW_HEIGHT } from './geometry';

interface BlockProps {
  span: SceneSpan;
  asset: ReelAsset | undefined;
  zoom: number;
  selected: boolean;
  maxMs: number;
  onSelect: (sceneId: string) => void;
  onResize: (sceneId: string, durationMs: number) => void;
}

const HANDLE_WIDTH = 10;
/** Arrow keys on the handle lengthen or shorten by a tenth of a second. */
const KEY_STEP_MS = 100;

/**
 * One scene: a button that selects it, and beside its right edge a handle that
 * changes its length. They are siblings, not nested — a control inside a button
 * is unreachable to a screen reader. A drag is previewed locally and lands as
 * ONE edit on release, so undo takes back the whole drag, not one pixel of it.
 */
function SceneBlock({ span, asset, zoom, selected, maxMs, onSelect, onResize }: Readonly<BlockProps>) {
  const { t } = useTranslation();
  const { scene, index } = span;
  const drag = useRef<{ x: number; ms: number } | null>(null);
  const [previewMs, setPreviewMs] = useState<number | null>(null);
  const durationMs = previewMs ?? scene.duration_ms;
  const { minSceneMs } = REEL_EDIT_LIMITS;
  const fit = (ms: number) => clamp(Math.round(ms), minSceneMs, maxMs);
  const number = index + 1;
  const length = formatReelDuration(durationMs);
  const label = asset?.name ?? t('ai.reels.editor.colourCard');
  // Drawn as long as it plays on the timeline, stretched by whatever the drag adds.
  const widthMs = span.endMs - span.startMs + (durationMs - scene.duration_ms);

  const onHandleDown = (event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    drag.current = { x: event.clientX, ms: scene.duration_ms };
  };
  const onHandleMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    setPreviewMs(fit(drag.current.ms + ((event.clientX - drag.current.x) / zoom) * 1000));
  };
  const onHandleUp = () => {
    if (drag.current && previewMs !== null && previewMs !== scene.duration_ms) onResize(scene.id, previewMs);
    drag.current = null;
    setPreviewMs(null);
  };
  const onHandleKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const delta = { ArrowRight: KEY_STEP_MS, ArrowLeft: -KEY_STEP_MS }[event.key];
    if (delta === undefined) return;
    event.preventDefault();
    onResize(scene.id, fit(scene.duration_ms + delta));
  };

  return (
    <Box sx={{ position: 'absolute', left: msToPx(span.startMs, zoom), top: 4, height: SCENE_ROW_HEIGHT - 8, width: msToPx(widthMs, zoom) }}>
      <ButtonBase
        onClick={() => onSelect(scene.id)}
        aria-pressed={selected}
        aria-label={t('ai.reels.editor.sceneBlock', { vars: { number, length } })}
        data-testid={`reel-timeline-scene-${scene.id}`}
        sx={{
          width: '100%',
          height: '100%',
          justifyContent: 'flex-start',
          gap: 0.75,
          px: 0.75,
          borderRadius: 1,
          overflow: 'hidden',
          bgcolor: 'action.selected',
          border: '2px solid',
          borderColor: selected ? 'primary.main' : 'divider',
          '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
        }}
      >
        <MediaThumb kind={asset?.kind ?? 'IMAGE'} src={asset?.thumbnail_url ?? ''} size={32} />
        <Box sx={{ minWidth: 0, textAlign: 'left' }}>
          <Typography variant="caption" component="p" noWrap sx={{ fontWeight: 600 }}>
            {number}. {label}
          </Typography>
          <Typography variant="caption" component="p" noWrap sx={{ color: 'text.secondary' }}>
            {length}
          </Typography>
        </Box>
      </ButtonBase>
      <Box
        role="slider"
        tabIndex={0}
        aria-label={t('ai.reels.editor.resizeScene', { vars: { number } })}
        aria-valuemin={minSceneMs}
        aria-valuemax={maxMs}
        aria-valuenow={durationMs}
        aria-valuetext={length}
        onPointerDown={onHandleDown}
        onPointerMove={onHandleMove}
        onPointerUp={onHandleUp}
        onKeyDown={onHandleKey}
        data-testid={`reel-timeline-resize-${scene.id}`}
        sx={{
          position: 'absolute',
          top: 0,
          right: -HANDLE_WIDTH / 2,
          width: HANDLE_WIDTH,
          height: '100%',
          cursor: 'ew-resize',
          // Above the next scene's block, which starts exactly where this handle sits.
          zIndex: 2,
          touchAction: 'none',
          borderRadius: 1,
          '&:hover, &:focus-visible': { bgcolor: 'primary.main', outline: 'none' },
        }}
      />
    </Box>
  );
}

interface Props {
  spans: readonly SceneSpan[];
  assets: ReadonlyMap<string, ReelAsset>;
  zoom: number;
  selectedId: string | null;
  maxMsOf: (scene: ReelScene) => number;
  onSelect: (sceneId: string) => void;
  onResize: (sceneId: string, durationMs: number) => void;
}

/** The scenes in order, each drawn as long as it plays. */
export default function SceneTrack({ spans, assets, zoom, selectedId, maxMsOf, onSelect, onResize }: Readonly<Props>) {
  return (
    <Box sx={{ position: 'relative', height: SCENE_ROW_HEIGHT }} data-testid="reel-track-scenes">
      {spans.map((span) => (
        <SceneBlock
          key={span.scene.id}
          span={span}
          asset={assets.get(span.scene.asset_id)}
          zoom={zoom}
          selected={span.scene.id === selectedId}
          maxMs={maxMsOf(span.scene)}
          onSelect={onSelect}
          onResize={onResize}
        />
      ))}
    </Box>
  );
}
