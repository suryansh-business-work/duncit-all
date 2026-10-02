import { Box, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { formatDateTime, useTranslation } from '@duncit/app-settings';
import { DetailBlock as Mono, DetailField as Field } from '../../components/DetailField';
import { userLabel } from '../../components/telemetry-identity';
import type { ErrorLogRow } from '../error-logs-page/queries';
import { parseBoundaryData, surfaceOf } from './boundary-data';

/** Everything one boundary row knows: where it crashed, on what, for whom, and the stacks. */
export default function ErrorBoundaryDetailDialog({
  row,
  onClose,
}: Readonly<{ row: ErrorLogRow | null; onClose: () => void }>) {
  const { t } = useTranslation();
  if (!row) return null;
  const data = parseBoundaryData(row);
  const event = data.event === 'REPORTED' ? t('tech.errorBoundaries.reported') : t('tech.errorBoundaries.caught');
  const scope = data.scope === 'root' ? t('tech.errorBoundaries.scopeRoot') : t('tech.errorBoundaries.scopePage');
  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{row.error?.name ?? row.page}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <Field label={t('tech.common.when')} value={formatDateTime(row.created_at)} />
            <Field label={t('tech.errorBoundaries.event')} value={event} />
            <Field label={t('tech.errorBoundaries.reference')} value={data.crash_id ?? ''} mono />
            <Field label={t('tech.errorBoundaries.scope')} value={scope} />
            <Field label={t('tech.errorBoundaries.surface')} value={surfaceOf(row)} />
            <Field label={t('tech.errorBoundaries.route')} value={row.page} />
            <Field label={t('tech.errorLogs.environment')} value={row.environment} />
            <Field label={t('tech.common.platform')} value={[row.platform, row.os].filter(Boolean).join(' · ')} />
            <Field label={t('tech.common.appVersion')} value={row.client?.app_version ?? ''} />
            <Field label="URL" value={row.url ?? ''} />
            <Field label={t('tech.common.user')} value={userLabel(row.user)} />
            <Field label={t('shell.common.email')} value={row.user?.email ?? ''} />
            <Field label={t('tech.common.session')} value={row.session_id ?? ''} />
            <Field label={t('tech.common.ipAddress')} value={row.ip ?? ''} />
          </Box>
          <Field label={t('tech.common.message')} value={row.error?.message ?? ''} />
          {row.error?.stack ? <Mono label={t('tech.common.stackTrace')} value={row.error.stack} /> : null}
          {data.component_stack ? (
            <Mono label={t('tech.errorBoundaries.componentStack')} value={data.component_stack} />
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose}>{t('shell.common.close')}</DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
