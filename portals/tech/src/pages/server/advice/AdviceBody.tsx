import { Box, Chip, Divider, Stack, Typography } from '@mui/material';
import { formatDay } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import VerdictItems from '../../stress-testing/run-detail/verdict/VerdictItems';
import InfoList from '../InfoList';
import { formatDateTime } from '../format';
import type { ServerAdvice } from '../history/queries';
import { adviceGradeColor, adviceGradeLabel } from './labels';

interface Props {
  advice: ServerAdvice;
}

/** The recommendation itself: the grade, what to change, what the month shows and which days stood out. */
export default function AdviceBody({ advice }: Readonly<Props>) {
  const { t } = useTranslation();
  const none = t('tech.server.adviceNone');

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Chip color={adviceGradeColor(advice.grade)} label={adviceGradeLabel(t, advice.grade)} />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {advice.headline}
        </Typography>
      </Stack>
      <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
        {advice.summary}
      </Typography>
      <Divider />
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        <VerdictItems title={t('tech.server.adviceRecommendations')} items={advice.recommendations} emptyText={none} />
        <VerdictItems title={t('tech.server.adviceTrends')} items={advice.trends} emptyText={none} />
      </Box>
      {advice.notableDays.length > 0 && (
        <Stack spacing={0.5}>
          <Typography variant="subtitle2">{t('tech.server.adviceNotableDays')}</Typography>
          <InfoList rows={advice.notableDays.map((day) => ({ label: formatDay(day.date), value: day.note }))} />
        </Stack>
      )}
      {advice.watchPoints.length > 0 && (
        <Stack spacing={0.5}>
          <Typography variant="subtitle2">{t('tech.server.adviceWatch')}</Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            {advice.watchPoints.map((point) => (
              <Typography key={point} component="li" variant="body2">
                {point}
              </Typography>
            ))}
          </Box>
        </Stack>
      )}
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {t('tech.server.adviceGenerated', {
          vars: {
            by: advice.generatedBy,
            at: formatDateTime(advice.generatedAt),
            model: advice.model,
            days: advice.daysWithData,
            period: advice.periodDays,
          },
        })}
      </Typography>
    </Stack>
  );
}
