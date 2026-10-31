import { useCallback, useMemo } from 'react';
import { Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { ReelSettingsForm, type ReelSettingsChange } from '../../../../forms/reel-settings';
import { updateSettings, updateVoiceover } from '../../editor/specEdits';
import type { SpecEditor } from '../../editor/useSpecEditor';
import type { ReelAsset, ReelSpec } from '../../types';

interface Props {
  spec: ReelSpec;
  assets: readonly ReelAsset[];
  apply: SpecEditor['apply'];
}

/**
 * The reel's own settings in the Edit tab, shown when nothing on the timeline
 * is selected: the frame it is cut for, how its words are drawn, the brand on
 * it, and how loud the voiceover plays. Each change lands on the reel at once
 * through the same `apply` the timeline uses, so it is undoable and saved.
 */
export default function ReelSettingsSection({ spec, assets, apply }: Readonly<Props>) {
  const { t } = useTranslation();
  const pictures = useMemo(
    () => assets.filter((asset) => asset.kind === 'IMAGE').map((asset) => ({ value: asset.id, label: asset.name })),
    [assets]
  );
  const onChange = useCallback(
    (change: ReelSettingsChange) =>
      apply((current) => updateVoiceover(updateSettings(current, change.settings), { volume: change.voiceover_volume })),
    [apply]
  );

  return (
    <Stack spacing={1.5} sx={{ p: 2 }} data-testid="reel-settings-section">
      <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600 }}>
        {t('ai.reels.settings.title')}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('ai.reels.settings.hint')}
      </Typography>
      <ReelSettingsForm spec={spec} pictures={pictures} onChange={onChange} />
    </Stack>
  );
}
