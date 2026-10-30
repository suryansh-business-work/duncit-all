import { Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import StatusChip from '../../unit/components/StatusChip';
import TestDialog from '../../unit/components/TestDialog';
import { describePath, formatDuration } from '../../unit/format';
import { describeBlocks, useScenarioStateLabels } from './labels';
import type { E2eScenarioRow } from './queries';

interface Props {
  scenario: E2eScenarioRow | null;
  onClose: () => void;
}

/** One scenario in full: how it ended, the describe blocks around it, and its error as Cypress printed it. */
export default function ScenarioDialog({ scenario, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = useScenarioStateLabels();
  if (!scenario) return null;
  return (
    <TestDialog
      open
      onClose={onClose}
      title={scenario.title || scenario.spec}
      workspace={scenario.project}
      file={scenario.spec}
      failure={scenario.error}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <StatusChip status={scenario.state} label={labels[scenario.state]} />
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {formatDuration(t, scenario.duration_ms)}
        </Typography>
      </Stack>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('testsUnit.cases.describePath', { vars: { path: describePath(describeBlocks(scenario.title_path)) } })}
      </Typography>
      {scenario.state === 'SKIPPED' && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('tech.e2eScenarios.skippedHint')}
        </Typography>
      )}
    </TestDialog>
  );
}
