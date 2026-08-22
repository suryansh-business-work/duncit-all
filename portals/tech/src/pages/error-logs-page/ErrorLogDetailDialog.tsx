import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from '@mui/material';
import { DetailBlock as Mono, DetailField as Field } from '../../components/DetailField';
import { userLabel } from '../../components/telemetry-identity';
import { parseIssueData, type ErrorLogRow } from './queries';
import { formatDateTime, useTranslation } from '@duncit/app-settings';

/** Everything one captured server-operation failure knows about itself. */
export default function ErrorLogDetailDialog({
  row,
  onClose,
}: Readonly<{ row: ErrorLogRow | null; onClose: () => void }>) {
  const { t } = useTranslation();
  if (!row) return null;
  const issue = parseIssueData(row);
  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{issue.operation ?? row.error?.name ?? 'Server error'}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <Field label={t('tech.common.when')} value={formatDateTime(row.created_at)} />
            <Field label={t('tech.errorLogs.environment')} value={row.environment} />
            <Field label={t('tech.common.source')} value={row.source} />
            <Field label={t('tech.common.page')} value={row.page} />
            <Field label={t('tech.common.platform')} value={[row.platform, row.os].filter(Boolean).join(' · ')} />
            <Field label={t('tech.errorLogs.kind')} value={issue.kind ?? ''} />
            <Field label={t('tech.errorLogs.graphqlCode')} value={issue.code ?? ''} />
            <Field label={t('tech.errorLogs.operation')} value={issue.operation ?? ''} />
            <Field label={t('tech.errorLogs.graphqlPath')} value={issue.gql_path ?? ''} />
            <Field label="URL" value={row.url ?? ''} />
            <Field label={t('tech.common.user')} value={userLabel(row.user)} />
            <Field label={t('shell.common.email')} value={row.user?.email ?? ''} />
            <Field label={t('shell.common.phone')} value={row.user?.phone ?? ''} />
            <Field label={t('tech.common.appVersion')} value={row.client?.app_version ?? ''} />
            <Field label={t('tech.common.ipAddress')} value={row.ip ?? ''} />
            <Field label={t('tech.common.session')} value={row.session_id ?? ''} />
          </Box>
          <Field label={t('tech.common.message')} value={row.error?.message ?? ''} />
          {row.error?.stack ? <Mono label={t('tech.common.stackTrace')} value={row.error.stack} /> : null}
          {row.data_json ? <Mono label={t('tech.common.structuredData')} value={row.data_json} /> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('shell.common.close')}</Button>
      </DialogActions>
    </Dialog>
  );
}
