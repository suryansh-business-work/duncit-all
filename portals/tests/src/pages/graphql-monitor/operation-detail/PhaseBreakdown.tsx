import { Box, Stack, Tooltip, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from '@duncit/shell';
import { SectionCard } from '@duncit/ui';
import { seriesColor } from '../../stress-testing/run-detail/charts/chartSetup';
import { formatMs } from '../../stress-testing/labels';
import type { LatencyNumbers } from '../queries';

interface Props {
  numbers: LatencyNumbers;
}

interface Phase {
  id: string;
  label: string;
  hint: string;
  ms: number;
}

/**
 * Where an average request's time goes. Parse and validate are the server's
 * own overhead (near zero once a document is cached); execute is the
 * resolvers; whatever is left of the average is everything around them —
 * context, plugins, serialising the response.
 */
export default function PhaseBreakdown({ numbers }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const measured = numbers.parse_avg_ms + numbers.validate_avg_ms + numbers.execute_avg_ms;
  const phases: Phase[] = [
    { id: 'parse', label: t('tech.graphqlMonitor.phaseParse'), hint: t('tech.graphqlMonitor.phaseParseHint'), ms: numbers.parse_avg_ms },
    { id: 'validate', label: t('tech.graphqlMonitor.phaseValidate'), hint: t('tech.graphqlMonitor.phaseValidateHint'), ms: numbers.validate_avg_ms },
    { id: 'execute', label: t('tech.graphqlMonitor.phaseExecute'), hint: t('tech.graphqlMonitor.phaseExecuteHint'), ms: numbers.execute_avg_ms },
    {
      id: 'other',
      label: t('tech.graphqlMonitor.phaseOther'),
      hint: t('tech.graphqlMonitor.phaseOtherHint'),
      ms: Math.max(0, numbers.avg_ms - measured),
    },
  ];
  const total = phases.reduce((sum, phase) => sum + phase.ms, 0) || 1;
  const colorOf = (index: number) => (index < 3 ? seriesColor(theme, index) : theme.palette.action.disabled);

  return (
    <SectionCard title={t('tech.graphqlMonitor.phasesTitle')} subtitle={t('tech.graphqlMonitor.phasesSubtitle')}>
      <Box
        role="img"
        aria-label={t('tech.graphqlMonitor.phasesTitle')}
        data-testid="graphql-monitor-phases-bar"
        sx={{ display: 'flex', height: 14, borderRadius: 1, overflow: 'hidden', bgcolor: 'action.hover' }}
      >
        {phases.map((phase, index) => (
          <Tooltip key={phase.id} title={`${phase.label}: ${formatMs(phase.ms)}`}>
            <Box sx={{ width: `${(phase.ms / total) * 100}%`, bgcolor: colorOf(index) }} />
          </Tooltip>
        ))}
      </Box>
      <Box sx={{ display: 'grid', gap: 1.5, mt: 2, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
        {phases.map((phase, index) => (
          <Stack key={phase.id} spacing={0.25} data-testid={`graphql-monitor-phase-${phase.id}`}>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: colorOf(index) }} />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {phase.label}
              </Typography>
            </Stack>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {formatMs(phase.ms)}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {phase.hint}
            </Typography>
          </Stack>
        ))}
      </Box>
    </SectionCard>
  );
}
