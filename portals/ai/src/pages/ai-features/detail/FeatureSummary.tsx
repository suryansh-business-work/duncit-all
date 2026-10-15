import { Alert, Box, Paper, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { formatDateTime } from '@duncit/app-settings';
import { usd, tokens } from '../../../lib/usd';
import FeatureSwitch from '../FeatureSwitch';
import type { AiFeature } from '../queries';

interface Props {
  feature: AiFeature;
  busy: boolean;
  onToggle: (feature: AiFeature, enabled: boolean) => void;
}

function Kpi({ label, value, hint }: Readonly<{ label: string; value: string; hint?: string }>) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, flex: '1 1 140px', minWidth: 0 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography variant="h6" component="p" noWrap>
        {value}
      </Typography>
      {hint && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {hint}
        </Typography>
      )}
    </Paper>
  );
}

/** The feature's header: what it is, its switch, and its usage over the range. */
export default function FeatureSummary({ feature, busy, onToggle }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' } }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
            {feature.label}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
            {feature.key} · {feature.module}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {feature.description}
          </Typography>
        </Box>
        <FeatureSwitch feature={feature} busy={busy} onToggle={onToggle} />
      </Stack>

      <Alert severity={feature.enabled ? 'info' : 'warning'}>
        <Typography variant="body2">
          {t('ai.features.whenOff', { vars: { whenOff: feature.when_off } })}
        </Typography>
        {feature.updated_at && (
          <Typography variant="caption">
            {t('ai.features.changedBy', {
              vars: {
                name: feature.updated_by_name || t('ai.features.someone'),
                when: formatDateTime(feature.updated_at),
              },
            })}
          </Typography>
        )}
      </Alert>

      <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 1.5 }}>
        <Kpi
          label={t('ai.features.colCalls')}
          value={tokens(feature.calls)}
          hint={t('ai.features.kpiCallsHint', {
            vars: { failed: feature.failed_calls, skipped: feature.skipped_calls },
          })}
        />
        <Kpi label={t('ai.features.colInputTokens')} value={tokens(feature.prompt_tokens)} />
        <Kpi label={t('ai.features.colOutputTokens')} value={tokens(feature.completion_tokens)} />
        <Kpi
          label={t('ai.features.colCost')}
          value={usd(feature.cost_usd)}
          hint={
            feature.unpriced_calls > 0
              ? t('ai.features.unpricedNote', { vars: { count: feature.unpriced_calls } })
              : undefined
          }
        />
        <Kpi
          label={t('ai.features.kpiAvgTime')}
          value={t('ai.features.ms', { vars: { ms: feature.avg_duration_ms } })}
        />
      </Stack>
    </Stack>
  );
}
