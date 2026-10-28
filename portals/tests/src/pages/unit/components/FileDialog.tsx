import { Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { useUnitLabels } from '../labels';
import type { UnitFileRow } from '../queries';
import FailureText from './FailureText';

interface Props {
  file: UnitFileRow | null;
  onClose: () => void;
}

function NameList({ title, names }: Readonly<{ title: string; names: readonly string[] }>) {
  if (names.length === 0) return null;
  return (
    <Stack spacing={0.75}>
      <Typography variant="subtitle2" component="h3">
        {title}
      </Typography>
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
        {names.map((name) => (
          <Chip key={name} size="small" variant="outlined" label={name} />
        ))}
      </Stack>
    </Stack>
  );
}

/** One test file in full: everything it mocks, the tests it names, and why it failed. */
export default function FileDialog({ file, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = useUnitLabels();
  return (
    <Dialog open={file !== null} onClose={onClose} fullWidth maxWidth="md" aria-labelledby="unit-file-dialog-title">
      {file && (
        <>
          <DialogTitle id="unit-file-dialog-title" sx={{ wordBreak: 'break-all' }}>
            {file.path}
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t('testsUnit.files.summary', {
                  vars: {
                    workspace: file.workspace,
                    kind: labels.fileKind[file.kind],
                    status: labels.fileStatus[file.status],
                    tests: file.tests,
                    failed: file.failed,
                  },
                })}
              </Typography>
              {file.failure_message && <FailureText text={file.failure_message} label={t('testsUnit.cases.failure')} />}
              <NameList title={t('testsUnit.files.mockedModules')} names={file.mocks} />
              <NameList title={t('testsUnit.files.mockedOperations')} names={file.gql_mocks} />
              {file.titles.length > 0 && (
                <Stack spacing={0.75}>
                  <Typography variant="subtitle2" component="h3">
                    {t('testsUnit.files.notRunTitles')}
                  </Typography>
                  <Stack component="ul" spacing={0.25} sx={{ m: 0, pl: 2.5 }}>
                    {file.titles.map((title) => (
                      <Typography key={title} component="li" variant="body2">
                        {title}
                      </Typography>
                    ))}
                  </Stack>
                </Stack>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <DuncitButton onClick={onClose}>{t('testsUnit.common.close')}</DuncitButton>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
