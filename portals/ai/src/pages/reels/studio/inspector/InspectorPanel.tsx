import { useCallback, useMemo, type ReactNode } from 'react';
import { Stack, Typography } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import type { ReelMusic, ReelOverlay, ReelScene, ReelText } from '@duncit/gql-types';
import { useTranslation } from '@duncit/shell';
import { ReelMusicForm } from '../../../../forms/reel-music';
import { ReelOverlayForm } from '../../../../forms/reel-overlay';
import { ReelSceneForm } from '../../../../forms/reel-scene';
import { ReelTextForm } from '../../../../forms/reel-text';
import { selectionExists, type ReelSelection } from '../../editor/layout';
import { maxSceneMs, updateMusic, updateOverlay, updateScene, updateText } from '../../editor/specEdits';
import type { SpecEditor } from '../../editor/useSpecEditor';
import type { ReelAsset, ReelSpec } from '../../types';

interface Props {
  spec: ReelSpec;
  assets: readonly ReelAsset[];
  selection: ReelSelection | null;
  apply: SpecEditor['apply'];
}

function Section({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <Stack spacing={1.5} sx={{ p: 2 }} data-testid="reel-inspector">
      <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      {children}
    </Stack>
  );
}

function EmptyInspector() {
  const { t } = useTranslation();
  return (
    <Stack spacing={1} sx={{ p: 3, alignItems: 'center', textAlign: 'center', color: 'text.secondary' }} data-testid="reel-inspector-empty">
      <TuneIcon sx={{ fontSize: 40 }} aria-hidden />
      <Typography variant="body2">{t('ai.reels.editor.inspectorEmpty')}</Typography>
    </Stack>
  );
}

/**
 * The Edit tab: the item selected on the timeline, as a form. Every valid change
 * lands on the reel as it is typed, through the same `apply` the timeline uses,
 * so it is undoable and saved like any other edit.
 */
export default function InspectorPanel({ spec, assets, selection, apply }: Readonly<Props>) {
  const { t } = useTranslation();
  const byId = useMemo(() => new Map(assets.map((asset) => [asset.id, asset])), [assets]);
  const footage = useMemo(
    () => [
      { value: '', label: t('ai.reels.editor.colourCard') },
      ...assets.filter((asset) => asset.kind !== 'AUDIO').map((asset) => ({ value: asset.id, label: asset.name })),
    ],
    [assets, t]
  );
  const sceneId = selection && selection.kind !== 'music' ? selection.sceneId : '';
  const itemId = selection && (selection.kind === 'text' || selection.kind === 'overlay') ? selection.itemId : '';

  const onScene = useCallback((patch: Partial<ReelScene>) => apply((s) => updateScene(s, sceneId, patch)), [apply, sceneId]);
  const onText = useCallback((patch: Partial<ReelText>) => apply((s) => updateText(s, sceneId, itemId, patch)), [apply, sceneId, itemId]);
  const onOverlay = useCallback(
    (patch: Partial<ReelOverlay>) => apply((s) => updateOverlay(s, sceneId, itemId, patch)),
    [apply, sceneId, itemId]
  );
  const onMusic = useCallback((patch: Partial<ReelMusic>) => apply((s) => updateMusic(s, patch)), [apply]);

  if (!selection || !selectionExists(spec, selection)) return <EmptyInspector />;

  if (selection.kind === 'music' && spec.music) {
    return (
      <Section title={t('ai.reels.editor.musicTitle')}>
        <ReelMusicForm music={spec.music} onChange={onMusic} />
      </Section>
    );
  }

  const index = spec.scenes.findIndex((scene) => scene.id === sceneId);
  const scene = spec.scenes[index];
  if (!scene) return <EmptyInspector />;
  const sceneSeconds = scene.duration_ms / 1000;

  if (selection.kind === 'text') {
    const text = scene.texts.find((item) => item.id === itemId);
    return text ? (
      <Section title={t('ai.reels.editor.textTitle')}>
        <ReelTextForm key={text.id} text={text} sceneSeconds={sceneSeconds} onChange={onText} />
      </Section>
    ) : (
      <EmptyInspector />
    );
  }

  if (selection.kind === 'overlay') {
    const overlay = scene.overlays.find((item) => item.id === itemId);
    return overlay ? (
      <Section title={t('ai.reels.editor.overlayTitle')}>
        <ReelOverlayForm key={overlay.id} overlay={overlay} sceneSeconds={sceneSeconds} onChange={onOverlay} />
      </Section>
    ) : (
      <EmptyInspector />
    );
  }

  const asset = byId.get(scene.asset_id);
  return (
    <Section title={t('ai.reels.editor.sceneTitle', { vars: { number: index + 1 } })}>
      <ReelSceneForm
        key={scene.id}
        scene={scene}
        footage={footage}
        isVideo={asset?.kind === 'VIDEO'}
        maxSeconds={maxSceneMs(scene, asset) / 1000}
        onChange={onScene}
      />
    </Section>
  );
}
