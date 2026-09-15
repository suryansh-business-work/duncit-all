import GroupsIcon from '@mui/icons-material/Groups';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import VerifiedIcon from '@mui/icons-material/Verified';
import { Box, Chip, Divider, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { formatDateTime } from '../../../server/format';
import MetricTiles, { type MetricTile } from '../../components/MetricTiles';
import type { StressVerdict } from '../../queries';
import { formatCount, gradeColor, gradeLabel, levelLabel } from '../../labels';
import VerdictItems from './VerdictItems';

interface Props {
  verdict: StressVerdict;
}

/** The verdict itself: the grade, how many people it holds, what is in the way and what to change. */
export default function VerdictBody({ verdict }: Readonly<Props>) {
  const { t } = useTranslation();
  const breakingPoint =
    verdict.breaking_point_users > 0 ? formatCount(verdict.breaking_point_users) : t('tech.stress.verdictNotReached');
  const tiles: MetricTile[] = [
    { id: 'safe', label: t('tech.stress.verdictSafeUsers'), value: formatCount(verdict.safe_concurrent_users), hint: t('tech.stress.verdictUsersHint'), icon: <GroupsIcon /> },
    { id: 'break', label: t('tech.stress.verdictBreakingPoint'), value: breakingPoint, hint: t('tech.stress.verdictUsersHint'), icon: <WhatshotIcon /> },
    { id: 'confidence', label: t('tech.stress.verdictConfidence'), value: levelLabel(t, verdict.confidence), icon: <VerifiedIcon /> },
  ];

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Chip color={gradeColor(verdict.grade)} label={gradeLabel(t, verdict.grade)} />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {verdict.headline}
        </Typography>
      </Stack>
      <MetricTiles tiles={tiles} minWidth={180} />
      <Stack spacing={0.5}>
        <Typography variant="subtitle2">{t('tech.stress.verdictReasoning')}</Typography>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
          {verdict.capacity_reasoning}
        </Typography>
      </Stack>
      <Divider />
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        <VerdictItems title={t('tech.stress.verdictBottlenecks')} items={verdict.bottlenecks} emptyText={t('tech.stress.verdictNoneFound')} />
        <VerdictItems title={t('tech.stress.verdictUpgrades')} items={verdict.upgrades} emptyText={t('tech.stress.verdictNoneFound')} />
      </Box>
      {verdict.watch_points.length > 0 && (
        <Stack spacing={0.5}>
          <Typography variant="subtitle2">{t('tech.stress.verdictWatch')}</Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            {verdict.watch_points.map((point) => (
              <Typography key={point} component="li" variant="body2">
                {point}
              </Typography>
            ))}
          </Box>
        </Stack>
      )}
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {t('tech.stress.verdictGenerated', {
          vars: { by: verdict.generated_by, at: formatDateTime(verdict.generated_at), model: verdict.model },
        })}
      </Typography>
    </Stack>
  );
}
