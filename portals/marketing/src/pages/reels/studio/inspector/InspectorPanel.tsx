import { useCallback, useMemo, type ReactNode } from 'react';
import { Stack, Typography } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import type { ReelMusic, ReelOverlay, ReelScene, ReelText } from '@duncit/gql-types';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { ReelMusicForm } from '../../../../forms/reel-music';
import { ReelOverlayForm } from '../../../../forms/reel-overlay';
import { ReelSceneForm } from '../../../../forms/reel-scene';
import { ReelTextForm } from '../../../../forms/reel-text';
import { resolveSelection, type ReelSelection } from '../../editor/layout';
import { maxSceneMs, updateMusic, updateOverlay, updateScene, updateText } from '../../editor/specEdits';
import type { SpecEditor } from '../../editor/useSpecEditor';
import type { ReelAsset, ReelSpec } from '../../types';
import ReelSettingsSection from './ReelSettingsSection';

interface Props {
  spec: ReelSpec;
  assets: readonly ReelAsset[];
  selection: ReelSelection | null;
  apply: SpecEditor['apply'];
  /** Clears the selection, which brings the reel's own settings back. */
  onDeselect: () => void;
}

function Section({ title, onDeselect, children }: Readonly<{ title: string; onDeselect: () => void; children: ReactNode }>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1.5} sx={{ p: 2 }} data-testid="reel-inspector">
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
        <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600, flex: 1 }}>
          {title}
        </Typography>
        <DuncitButton size="small" variant="text" startIcon={<TuneIcon />} onClick={onDeselect} data-testid="reel-inspector-settings">
          {t('ai.reels.settings.open')}
        </DuncitButton>
      </Stack>
      {children}
    </Stack>
  );
}

/**
 * The Edit tab: the item selected on the timeline, as a form — or, with
 * nothing selected, the reel's own settings. Every valid change lands on the
 * reel as it is typed, through the same `apply` the timeline uses, so it is
 * undoable and saved like any other edit.
 */
export default function InspectorPanel({ spec, assets, selection, apply, onDeselect }: Readonly<Props>) {
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

  const resolved = resolveSelection(spec, selection);
  if (!resolved) return <ReelSettingsSection spec={spec} assets={assets} apply={apply} />;

  if (resolved.kind === 'music') {
    return (
      <Section title={t('ai.reels.editor.musicTitle')} onDeselect={onDeselect}>
        <ReelMusicForm music={resolved.music} onChange={onMusic} />
      </Section>
    );
  }

  const { scene, index } = resolved;
  const sceneSeconds = scene.duration_ms / 1000;

  if (resolved.kind === 'text') {
    return (
      <Section title={t('ai.reels.editor.textTitle')} onDeselect={onDeselect}>
        <ReelTextForm key={resolved.text.id} text={resolved.text} sceneSeconds={sceneSeconds} onChange={onText} />
      </Section>
    );
  }

  if (resolved.kind === 'overlay') {
    return (
      <Section title={t('ai.reels.editor.overlayTitle')} onDeselect={onDeselect}>
        <ReelOverlayForm key={resolved.overlay.id} overlay={resolved.overlay} sceneSeconds={sceneSeconds} onChange={onOverlay} />
      </Section>
    );
  }

  const asset = byId.get(scene.asset_id);
  return (
    <Section title={t('ai.reels.editor.sceneTitle', { vars: { number: index + 1 } })} onDeselect={onDeselect}>
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
