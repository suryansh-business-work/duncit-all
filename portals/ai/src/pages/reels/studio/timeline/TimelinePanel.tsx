import { useCallback, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import type { PlayerRef } from '@remotion/player';
import { useTranslation } from '@duncit/shell';
import { framesToMs, itemSpans, reelLengthMs, sceneSpans, type ItemSpan, type ReelSelection } from '../../editor/layout';
import { maxSceneMs, updateScene } from '../../editor/specEdits';
import { usePlayerFrame } from '../../editor/usePlayerFrame';
import type { SpecEditor } from '../../editor/useSpecEditor';
import type { ReelAsset, ReelScene } from '../../types';
import { DEFAULT_ZOOM, LABEL_WIDTH, msToPx } from './geometry';
import ItemTrack, { type TrackBlock } from './ItemTrack';
import SceneTrack from './SceneTrack';
import TimeRuler from './TimeRuler';
import TimelineToolbar from './TimelineToolbar';
import { useTimelineActions } from './useTimelineActions';

interface Props {
  assets: readonly ReelAsset[];
  player: PlayerRef | null;
  selection: ReelSelection | null;
  onSelect: (selection: ReelSelection | null) => void;
  editor: SpecEditor;
}

/** A track's name, pinned to the left while the tracks scroll sideways under it. */
function TrackRow({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <Stack direction="row" sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ position: 'sticky', left: 0, zIndex: 2, width: LABEL_WIDTH, flexShrink: 0, px: 1.5, py: 0.75, bgcolor: 'background.paper', borderRight: '1px solid', borderColor: 'divider' }}>
        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
          {label}
        </Typography>
      </Box>
      <Box sx={{ flex: 1 }}>{children}</Box>
    </Stack>
  );
}

/** Typing in a field owns its keys; the timeline's shortcuts apply everywhere else in it. */
const isTyping = (target: EventTarget): boolean =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

/**
 * The timeline under the preview: a ruler that moves the playhead, and the
 * reel's scenes, texts, overlays and music as tracks drawn to scale. Clicking
 * an item selects it for the Edit tab; the toolbar adds, cuts and rearranges.
 */
export default function TimelinePanel({ assets, player, selection, onSelect, editor }: Readonly<Props>) {
  const { t } = useTranslation();
  const { spec, apply } = editor;
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const frame = usePlayerFrame(player);
  const playheadMs = framesToMs(frame, spec.fps);
  const byId = useMemo(() => new Map(assets.map((asset) => [asset.id, asset])), [assets]);
  const spans = useMemo(() => sceneSpans(spec), [spec]);
  const lengthMs = reelLengthMs(spans);
  const actions = useTimelineActions({ spec, playheadMs, selection, onSelect, apply });

  const seek = useCallback((ms: number) => player?.seekTo(Math.round((ms / 1000) * spec.fps)), [player, spec.fps]);
  const resize = useCallback((sceneId: string, durationMs: number) => apply((s) => updateScene(s, sceneId, { duration_ms: durationMs })), [apply]);
  const maxMsOf = useCallback((scene: ReelScene) => maxSceneMs(scene, byId.get(scene.asset_id)), [byId]);
  const selectScene = useCallback((sceneId: string) => onSelect({ kind: 'scene', sceneId }), [onSelect]);

  const selectedItemId = selection?.kind === 'text' || selection?.kind === 'overlay' ? selection.itemId : null;
  const toBlocks = (items: ItemSpan[]): TrackBlock[] =>
    items.map((span) => {
      const isText = span.kind === 'text';
      const words = 'text' in span.item ? span.item.text : '';
      const name = 'asset_id' in span.item ? (byId.get(span.item.asset_id)?.name ?? '') : '';
      const selected = selection?.kind === span.kind && selectedItemId === span.item.id;
      return {
        id: span.item.id,
        startMs: span.startMs,
        endMs: span.endMs,
        lane: span.lane,
        text: isText ? words : name,
        label: isText ? t('ai.reels.editor.textBlock', { vars: { text: words } }) : t('ai.reels.editor.overlayBlock', { vars: { name } }),
        selected,
        onSelect: () => onSelect({ kind: span.kind, sceneId: span.sceneId, itemId: span.item.id }),
      };
    });
  const textBlocks = toBlocks(itemSpans(spans, 'text'));
  const overlayBlocks = toBlocks(itemSpans(spans, 'overlay'));
  const songName = spec.music ? (byId.get(spec.music.asset_id)?.name ?? '') : '';
  const musicBlocks: TrackBlock[] = spec.music
    ? [{ id: 'music', startMs: 0, endMs: lengthMs, lane: 0, text: songName, label: t('ai.reels.editor.musicBlock', { vars: { name: songName } }), selected: selection?.kind === 'music', onSelect: () => onSelect({ kind: 'music' }) }]
    : [];

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (isTyping(event.target)) return;
    const mod = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();
    if (mod && (key === 'y' || (key === 'z' && event.shiftKey))) editor.redo();
    else if (mod && key === 'z') editor.undo();
    else if ((event.key === 'Delete' || event.key === 'Backspace') && actions.can.remove) actions.remove();
    else return;
    event.preventDefault();
  };

  return (
    <Stack component="section" aria-label={t('ai.reels.editor.timelineLabel')} onKeyDown={onKeyDown} sx={{ height: '100%', minHeight: 0 }} data-testid="reel-timeline">
      <TimelineToolbar assets={assets} actions={actions} editor={editor} zoom={zoom} onZoom={setZoom} />
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <Box sx={{ position: 'relative', minWidth: '100%', width: 'max-content' }}>
          <TrackRow label="">
            <TimeRuler lengthMs={lengthMs} playheadMs={playheadMs} zoom={zoom} onSeek={seek} />
          </TrackRow>
          <TrackRow label={t('ai.reels.editor.trackScenes')}>
            <SceneTrack spans={spans} assets={byId} zoom={zoom} selectedId={selection?.kind === 'scene' ? selection.sceneId : null} maxMsOf={maxMsOf} onSelect={selectScene} onResize={resize} />
          </TrackRow>
          <TrackRow label={t('ai.reels.editor.trackText')}>
            <ItemTrack blocks={textBlocks} zoom={zoom} tone="info" testId="reel-track-text" />
          </TrackRow>
          <TrackRow label={t('ai.reels.editor.trackOverlays')}>
            <ItemTrack blocks={overlayBlocks} zoom={zoom} tone="secondary" testId="reel-track-overlays" />
          </TrackRow>
          <TrackRow label={t('ai.reels.editor.trackMusic')}>
            <ItemTrack blocks={musicBlocks} zoom={zoom} tone="warning" testId="reel-track-music" />
          </TrackRow>
          <Box aria-hidden data-testid="reel-playhead" sx={{ position: 'absolute', top: 0, bottom: 0, left: LABEL_WIDTH + msToPx(playheadMs, zoom), width: 2, bgcolor: 'primary.main', pointerEvents: 'none', zIndex: 1 }} />
        </Box>
      </Box>
    </Stack>
  );
}
