import { useEffect, useMemo, useRef } from 'react';
import { Chip, Stack, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { DuncitButton } from '@duncit/buttons';
import { DuncitTable, clientTableFetch, type DuncitColumn } from '@duncit/table';
import { formatDate, useTranslation } from '@duncit/app-settings';
import type { SslCertificate } from '@duncit/gql-types';
import { COVERAGE_KEY, LEVEL_CHIP, sslExpiryLevel } from './expiry';

type Translate = ReturnType<typeof useTranslation>['t'];

const getRowId = (row: SslCertificate) => row.name;
const searchOf = (row: SslCertificate) => `${row.name} ${row.domains.join(' ')} ${row.key_type} ${row.issuer ?? ''}`;

const renderName = (row: SslCertificate, t: Translate) => (
  <Stack sx={{ gap: 0.25, py: 0.5 }}>
    <Typography variant="body2" sx={{ fontWeight: 600 }}>
      {row.name}
    </Typography>
    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
      {t('tech.ssl.domainCount', { vars: { count: String(row.domains.length) } })}
    </Typography>
  </Stack>
);

function renderDays(row: SslCertificate, t: Translate) {
  const days = row.days_remaining;
  const label = days < 0 ? t('tech.ssl.expiredDaysAgo', { vars: { days: String(-days) } }) : String(days);
  return <Chip size="small" color={LEVEL_CHIP[sslExpiryLevel(days)]} label={label} />;
}

interface Props {
  certificates: SslCertificate[];
  onDetails: (row: SslCertificate) => void;
}

/** Every certbot lineage on the host — a handful of rows, so paged in the browser. */
export default function SslCertificatesTable({ certificates, onDetails }: Readonly<Props>) {
  const { t } = useTranslation();
  const refetchRef = useRef<(() => void) | null>(null);
  const coverages = useMemo(
    () => Object.entries(COVERAGE_KEY).map(([value, key]) => ({ value, label: t(key) })),
    [t],
  );

  const columns = useMemo<DuncitColumn<SslCertificate>[]>(
    () => [
      {
        field: 'name',
        headerName: t('shell.common.name'),
        flex: 1,
        minWidth: 200,
        type: 'text',
        cellRenderer: (row) => renderName(row, t),
      },
      {
        field: 'days_remaining',
        headerName: t('tech.ssl.colDaysLeft'),
        width: 140,
        type: 'number',
        cellRenderer: (row) => renderDays(row, t),
      },
      {
        field: 'valid_to',
        headerName: t('tech.ssl.colExpires'),
        width: 150,
        type: 'date',
        valueGetter: (row) => formatDate(row.valid_to),
      },
      {
        field: 'renewal_due_at',
        headerName: t('tech.ssl.colRenewsFrom'),
        width: 150,
        type: 'date',
        valueGetter: (row) => formatDate(row.renewal_due_at),
      },
      { field: 'key_type', headerName: t('tech.ssl.colKeyType'), width: 170, type: 'text' },
      {
        field: 'coverage',
        headerName: t('tech.ssl.colCoverage'),
        width: 150,
        type: 'enum',
        options: coverages,
        valueGetter: (row) => t(COVERAGE_KEY[row.coverage]),
      },
      { field: 'issuer', headerName: t('tech.ssl.colIssuer'), flex: 1, minWidth: 160, type: 'text' },
      {
        field: 'actions',
        headerName: '',
        type: 'actions',
        width: 130,
        valueGetter: (row) => row.serial_number,
        cellRenderer: (row: SslCertificate) => (
          <DuncitButton
            size="small"
            variant="outlined"
            startIcon={<InfoOutlinedIcon fontSize="small" />}
            onClick={() => onDetails(row)}
            aria-label={t('tech.ssl.detailsFor', { vars: { name: row.name } })}
            data-testid={`ssl-details-${row.name}`}
          >
            {t('tech.ssl.details')}
          </DuncitButton>
        ),
      },
    ],
    [coverages, onDetails, t],
  );
  const fetchRows = useMemo(() => clientTableFetch(certificates, searchOf, columns), [certificates, columns]);

  // The table fetches once per query change, so a refreshed listing has to ask it to read again.
  useEffect(() => {
    refetchRef.current?.();
  }, [fetchRows]);

  return (
    <DuncitTable<SslCertificate>
      ariaLabel={t('tech.ssl.pageTitle')}
      tableId="tech-ssl-certificates"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={t('tech.ssl.empty')}
      searchPlaceholder={t('tech.ssl.searchPlaceholder')}
      defaultSort={{ field: 'days_remaining', dir: 'asc' }}
      refetchRef={refetchRef}
    />
  );
}
