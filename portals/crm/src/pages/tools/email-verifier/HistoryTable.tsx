import { useMemo, type MutableRefObject } from 'react';
import { Stack, Typography } from '@mui/material';
import { DuncitTable, dateColumn, type DuncitColumn, type TableFetch } from '@duncit/table';
import { useTranslation, type Translate } from '@duncit/shell';
import type { CheckedEmailStatus, CrmEmailVerification } from '../../../api/emailVerification.gql';
import { EMAIL_STATUS_COPY, EmailStatusChip } from '../../../components/email-status';

interface Props {
  fetchRows: TableFetch<CrmEmailVerification>;
  refetchRef: MutableRefObject<(() => void) | null>;
}

const CHECKED_STATUSES: readonly CheckedEmailStatus[] = ['VERIFIED', 'RISKY', 'INVALID', 'UNKNOWN'];

const getRowId = (row: CrmEmailVerification) => row.id;

const renderStatus = (row: CrmEmailVerification) => <EmailStatusChip status={row.status} />;

/** The checked address, with the typo fix the verifier suggested under it. */
const makeRenderEmail = (t: Translate) => (row: CrmEmailVerification) => (
  <Stack component="span" sx={{ lineHeight: 1.2, minWidth: 0 }}>
    <Typography variant="body2" component="span" sx={{ fontWeight: 600, wordBreak: 'break-all' }}>
      {row.email}
    </Typography>
    {row.suggestion && (
      <Typography variant="caption" component="span" sx={{ color: 'text.secondary' }}>
        {t('crm.emailVerifier.didYouMean', { vars: { email: row.suggestion } })}
      </Typography>
    )}
  </Stack>
);

/** Every check the CRM has run — single and bulk — newest first. */
export function HistoryTable({ fetchRows, refetchRef }: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<CrmEmailVerification>[]>(
    () => [
      {
        field: 'email',
        headerName: t('shell.common.email'),
        type: 'text',
        flex: 1,
        minWidth: 220,
        cellRenderer: makeRenderEmail(t),
        valueGetter: (row) => row.email,
      },
      {
        field: 'status',
        headerName: t('shell.common.status'),
        type: 'enum',
        options: CHECKED_STATUSES.map((status) => ({ value: status, label: t(EMAIL_STATUS_COPY[status]) })),
        width: 150,
        cellRenderer: renderStatus,
      },
      {
        field: 'source',
        headerName: t('crm.emailVerifier.source'),
        type: 'enum',
        options: [
          { value: 'SINGLE', label: t('crm.emailVerifier.sourceSingle') },
          { value: 'BULK', label: t('crm.emailVerifier.sourceBulk') },
        ],
        width: 130,
        valueGetter: (row) =>
          row.source === 'BULK' ? t('crm.emailVerifier.sourceBulk') : t('crm.emailVerifier.sourceSingle'),
      },
      {
        field: 'checked_by',
        headerName: t('crm.emailVerifier.checkedBy'),
        type: 'text',
        minWidth: 180,
        filterable: false,
        sortable: false,
      },
      dateColumn<CrmEmailVerification>({ hide: false, headerName: t('crm.emailVerifier.checkedOn'), width: 170 }),
    ],
    [t]
  );

  return (
    <DuncitTable<CrmEmailVerification>
      ariaLabel={t('crm.emailVerifier.historyTitle')}
      tableId="crm-email-verifications"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={t('crm.emailVerifier.historyEmpty')}
      searchPlaceholder={t('crm.emailVerifier.historySearch')}
      refetchRef={refetchRef}
    />
  );
}
