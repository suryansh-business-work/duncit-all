import { Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import StatusChip from '../components/StatusChip';
import TestDialog from '../components/TestDialog';
import { describePath, formatDuration } from '../format';
import { useUnitLabels } from '../labels';
import type { UnitCaseRow } from '../queries';

interface Props {
  testCase: UnitCaseRow | null;
  onClose: () => void;
}

/** One test case in full: how it went, its describe path, and its failure. */
export default function CaseDialog({ testCase, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = useUnitLabels();
  if (!testCase) return null;
  return (
    <TestDialog
      open
      onClose={onClose}
      title={testCase.title || testCase.full_name}
      workspace={testCase.workspace}
      file={testCase.file}
      failure={testCase.failure_message}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <StatusChip status={testCase.status} label={labels.caseStatus[testCase.status]} />
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {formatDuration(t, testCase.duration_ms)}
        </Typography>
      </Stack>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('testsUnit.cases.describePath', { vars: { path: describePath(testCase.ancestor_titles) } })}
      </Typography>
    </TestDialog>
  );
}
