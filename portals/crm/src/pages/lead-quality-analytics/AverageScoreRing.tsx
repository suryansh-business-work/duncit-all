import { Box, CircularProgress, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from '@duncit/shell';
import { formatScore } from './analyticsData';

/** Ring diameter in theme spacing units — the detail-page size of the lead ring. */
const SIZE_UNITS = 11;

/**
 * An average Quality Score as a ring out of 100. Drawn in the primary colour,
 * not a score band's: an average is not a lead, so it has no classification.
 */
export default function AverageScoreRing({ score }: Readonly<{ score: number | null | undefined }>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const scored = typeof score === 'number' && Number.isFinite(score);
  const value = scored ? Math.min(Math.max(score, 0), 100) : 0;
  const diameter = theme.spacing(SIZE_UNITS);
  const shown = formatScore(score);
  const aria = scored ? t('crm.leadQualityAnalytics.averageAria', { vars: { score: shown } }) : t('crm.leadQualityAnalytics.noAverage');
  return (
    <Box role="img" aria-label={aria} sx={{ position: 'relative', display: 'inline-flex', width: diameter, height: diameter, flexShrink: 0 }}>
      <CircularProgress variant="determinate" value={100} size={diameter} thickness={4} sx={{ color: 'action.hover', position: 'absolute' }} aria-hidden />
      <CircularProgress variant="determinate" value={value} size={diameter} thickness={4} color="primary" aria-hidden />
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }} aria-hidden>
        <Typography variant="h6" component="span" sx={{ fontWeight: 700, lineHeight: 1 }}>
          {shown}
        </Typography>
        <Typography variant="caption" component="span" sx={{ color: 'text.secondary' }}>
          {t('crm.leadQualityAnalytics.average')}
        </Typography>
      </Box>
    </Box>
  );
}
