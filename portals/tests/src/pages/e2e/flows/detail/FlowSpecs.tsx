import { Box, Chip, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { tokens } from '@duncit/theme';
import type { E2eFlow } from '../queries';

/**
 * Which spec files test this flow, and how they did across the recorded runs —
 * the counts the Flows table shows, with what they are counted from, so a spec
 * linked to the wrong flow is visible here.
 */
export default function FlowSpecs({ flow }: Readonly<{ flow: E2eFlow }>) {
  const { t } = useTranslation();
  if (flow.specs.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('tech.e2eFlows.notAutomated')}
      </Typography>
    );
  }
  const stats = flow.run_stats ?? { runs: 0, passed: 0, failed: 0 };
  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="subtitle2" component="h2">
          {t('tech.e2eFlows.testedBy', { vars: { count: flow.specs.length } })}
        </Typography>
        <Chip size="small" variant="outlined" label={t('tech.e2eFlows.runsCount', { vars: { count: stats.runs } })} />
        <Chip size="small" color="success" label={t('tech.e2eFlows.passedCount', { vars: { count: stats.passed } })} />
        <Chip size="small" color="error" label={t('tech.e2eFlows.failedCount', { vars: { count: stats.failed } })} />
      </Stack>
      <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
        {flow.specs.map((spec) => (
          <Typography
            key={spec}
            component="li"
            variant="caption"
            sx={{ fontFamily: tokens.font.mono, wordBreak: 'break-all', color: 'text.secondary' }}
          >
            {spec}
          </Typography>
        ))}
      </Box>
    </Stack>
  );
}
