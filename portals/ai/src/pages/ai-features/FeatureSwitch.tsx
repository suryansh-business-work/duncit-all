import { Stack, Switch, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { AiFeature } from './queries';

interface Props {
  feature: AiFeature;
  busy: boolean;
  onToggle: (feature: AiFeature, enabled: boolean) => void;
}

// Inside a clickable table row the switch's <input> is on @duncit/table's
// row-click ignore list, so toggling never also opens the feature's logs.
export default function FeatureSwitch({ feature, busy, onToggle }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
      <Switch
        size="small"
        checked={feature.enabled}
        disabled={busy}
        onChange={(_e, checked) => onToggle(feature, checked)}
        slotProps={{
          input: { 'aria-label': t('ai.features.switchAria', { vars: { name: feature.label } }) },
        }}
      />
      <Typography variant="body2" sx={{ color: feature.enabled ? 'success.main' : 'text.secondary' }}>
        {feature.enabled ? t('ai.features.on') : t('ai.features.off')}
      </Typography>
    </Stack>
  );
}
