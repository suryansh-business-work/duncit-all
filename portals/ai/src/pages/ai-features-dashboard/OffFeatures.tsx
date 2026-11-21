import { Link as RouterLink } from 'react-router';
import { Link, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { DashboardFeature } from './queries';

/**
 * The features someone switched off, each opening its own page (where it can
 * be switched back on and its "when off" fallback is spelled out).
 */
export default function OffFeatures({ features, rangeDays }: Readonly<{ features: readonly DashboardFeature[]; rangeDays: number }>) {
  const { t } = useTranslation();
  const off = features.filter((feature) => !feature.enabled);
  if (off.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('ai.featuresDashboard.noneOff')}
      </Typography>
    );
  }
  return (
    <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 1.5 }}>
      {off.map((feature) => (
        <Link
          key={feature.key}
          component={RouterLink}
          to={`/ai-features/${encodeURIComponent(feature.key)}?days=${rangeDays}`}
          variant="body2"
        >
          {feature.label}
        </Link>
      ))}
    </Stack>
  );
}
