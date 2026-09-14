import { Stack, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material';
import { useTranslation, type Translate } from '@duncit/shell';
import { STRESS_PRESETS, type StressPresetKey } from './new-stress-run.types';

interface Props {
  value: StressPresetKey | null;
  onPick: (preset: StressPresetKey) => void;
}

function presetCopy(t: Translate, key: StressPresetKey): { label: string; hint: string } {
  const copy: Record<StressPresetKey, { label: string; hint: string }> = {
    smoke: { label: t('tech.stress.presetSmoke'), hint: t('tech.stress.presetSmokeHint') },
    load: { label: t('tech.stress.presetLoad'), hint: t('tech.stress.presetLoadHint') },
    stress: { label: t('tech.stress.presetStress'), hint: t('tech.stress.presetStressHint') },
    spike: { label: t('tech.stress.presetSpike'), hint: t('tech.stress.presetSpikeHint') },
    soak: { label: t('tech.stress.presetSoak'), hint: t('tech.stress.presetSoakHint') },
  };
  return copy[key];
}

/** The classic test shapes, one click each. Picking one fills the numbers below; they stay editable. */
export default function PresetPicker({ value, onPick }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={0.75}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {t('tech.stress.presetsLabel')}
      </Typography>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={value}
        onChange={(_, next: StressPresetKey | null) => next && onPick(next)}
        sx={{ flexWrap: 'wrap' }}
      >
        {STRESS_PRESETS.map((key) => {
          const copy = presetCopy(t, key);
          return (
            <Tooltip key={key} title={copy.hint}>
              <ToggleButton value={key}>{copy.label}</ToggleButton>
            </Tooltip>
          );
        })}
      </ToggleButtonGroup>
    </Stack>
  );
}
