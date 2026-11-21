import { useCallback, useMemo, useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Box, Stack, Typography } from '@mui/material';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { getEmailValidationColumns } from './columns';
import { EMAIL_VALIDATIONS_TABLE, type EmailValidationLogRow } from './queries';
import ValidationResultDialog, { type ValidationTarget } from './ValidationResultDialog';

const getRowId = (row: EmailValidationLogRow) => row.id;

/**
 * Admin › Email Validations › Logs — every validation any console ran, newest
 * first, searchable and filterable by result, console, source and date. A row
 * opens its full result; Re-validate runs it again and logs a new row, so the
 * history of an address is every row with its email.
 */
export default function EmailValidationLogsPage() {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [target, setTarget] = useState<ValidationTarget | null>(null);

  const fetchRows = useApolloTableFetch<EmailValidationLogRow>(client, EMAIL_VALIDATIONS_TABLE, 'emailValidationsTable');

  const columns = useMemo(
    () =>
      getEmailValidationColumns({
        t,
        formatDateTime,
        onView: (row) => setTarget({ row, run: false }),
        onRevalidate: (row) => setTarget({ row, run: true }),
      }),
    [t, formatDateTime]
  );

  const refetch = useCallback(() => refetchRef.current?.(), []);

  return (
    <Stack spacing={2} data-testid="email-validation-logs-page">
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <MarkEmailReadIcon color="primary" />
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
            {t('admin.emailValidations.logsTitle')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('admin.emailValidations.logsSubtitle')}
          </Typography>
        </Box>
      </Stack>

      <DuncitTable<EmailValidationLogRow>
        ariaLabel={t('admin.emailValidations.logsTitle')}
        tableId="admin-email-validations"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        emptyText={t('admin.emailValidations.empty')}
        defaultSort={{ field: 'created_at', dir: 'desc' }}
        searchPlaceholder={t('admin.emailValidations.searchPlaceholder')}
        refetchRef={refetchRef}
      />

      <ValidationResultDialog target={target} onClose={() => setTarget(null)} onRevalidated={refetch} />
    </Stack>
  );
}
