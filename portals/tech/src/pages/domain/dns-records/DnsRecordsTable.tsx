import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Chip, Stack, Typography } from '@mui/material';
import { DuncitTable, actionsColumn, clientTableFetch, type DuncitColumn } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import type { DnsRecord, DnsScope } from '@duncit/gql-types';
import { recordHost } from '../queries';

type Translate = ReturnType<typeof useTranslation>['t'];

const getRowId = (row: DnsRecord) => row.id;

/** What a search term is matched against — the type, the name and the value. */
const searchOf = (row: DnsRecord) => `${row.type} ${row.name} ${row.data}`;

/** Outlined for the types GoDaddy's nameservers own, so the read-only rows read as different. */
const renderType = (row: DnsRecord) => (
  <Chip size="small" label={row.type} variant={row.editable ? 'filled' : 'outlined'} />
);

const scopeLabel = (scope: DnsScope, t: Translate) =>
  scope === 'STAGING' ? t('tech.dns.scopeStaging') : t('tech.dns.scopeProduction');

/**
 * Which stack the record answers for. Staging is the quieter chip: a zone is
 * mostly production, and the replica is the exception worth spotting.
 */
const renderScope = (row: DnsRecord, t: Translate) => (
  <Chip
    size="small"
    label={scopeLabel(row.scope, t)}
    color={row.scope === 'STAGING' ? 'default' : 'primary'}
    variant="outlined"
  />
);

const renderHost = (row: DnsRecord, domain: string) => (
  <Stack sx={{ gap: 0.25, py: 0.5 }}>
    <Typography variant="body2" sx={{ fontWeight: 600 }}>
      {row.name}
    </Typography>
    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
      {recordHost(row.name, domain)}
    </Typography>
  </Stack>
);

/** Values are addresses, hostnames and long TXT tokens: monospace, and allowed to wrap anywhere. */
const renderValue = (row: DnsRecord) => (
  <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', py: 0.5 }}>
    {row.data}
  </Typography>
);

/** The same refusal on Edit and Delete: a read-only row names who owns it. */
const readOnlyAction = (t: Translate) => ({
  disabled: (row: DnsRecord) => !row.editable,
  disabledTitle: (row: DnsRecord) => t('tech.dns.readOnly', { vars: { type: row.type } }),
});

interface Props {
  records: DnsRecord[];
  domain: string;
  toolbarActions: ReactNode;
  onEdit: (row: DnsRecord) => void;
  onDelete: (row: DnsRecord) => void;
}

/**
 * Every record in the zone, paged in the browser: GoDaddy returns the whole
 * zone in one call, and a zone is a few hundred rows at the very most.
 */
export default function DnsRecordsTable({ records, domain, toolbarActions, onEdit, onDelete }: Readonly<Props>) {
  const { t } = useTranslation();
  const refetchRef = useRef<(() => void) | null>(null);
  // The types this zone actually holds — every one a filter could match.
  const types = useMemo(
    () => [...new Set(records.map((row) => row.type))].map((type) => ({ value: type, label: type })),
    [records],
  );
  const scopes = useMemo(
    () => [
      { value: 'PRODUCTION', label: t('tech.dns.scopeProduction') },
      { value: 'STAGING', label: t('tech.dns.scopeStaging') },
    ],
    [t],
  );

  const columns = useMemo<DuncitColumn<DnsRecord>[]>(
    () => [
      {
        field: 'type',
        headerName: t('shell.common.type'),
        width: 110,
        type: 'enum',
        options: types,
        cellRenderer: renderType,
      },
      {
        field: 'scope',
        headerName: t('tech.dns.colScope'),
        width: 130,
        type: 'enum',
        options: scopes,
        cellRenderer: (row) => renderScope(row, t),
        valueGetter: (row) => scopeLabel(row.scope, t),
      },
      {
        field: 'name',
        headerName: t('tech.dns.colHost'),
        flex: 1,
        minWidth: 200,
        type: 'text',
        cellRenderer: (row) => renderHost(row, domain),
      },
      {
        field: 'data',
        headerName: t('tech.dns.colValue'),
        flex: 1.6,
        minWidth: 240,
        type: 'text',
        cellRenderer: renderValue,
      },
      { field: 'ttl', headerName: t('tech.dns.colTtl'), width: 140, type: 'number' },
      { field: 'priority', headerName: t('tech.dns.colPriority'), width: 110, type: 'number' },
      actionsColumn<DnsRecord>({
        width: 120,
        onEdit,
        onDelete,
        edit: readOnlyAction(t),
        delete: readOnlyAction(t),
      }),
    ],
    [domain, onDelete, onEdit, scopes, t, types],
  );
  const fetchRows = useMemo(() => clientTableFetch(records, searchOf, columns), [records, columns]);

  // The table fetches once per query change, not per new fetch function — so a
  // saved or deleted record has to ask it to read the new zone.
  useEffect(() => {
    refetchRef.current?.();
  }, [fetchRows]);

  return (
    <DuncitTable<DnsRecord>
      ariaLabel={t('shell.nav.dnsRecords')}
      tableId="tech-dns-records"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      toolbarActions={toolbarActions}
      emptyText={t('tech.dns.empty')}
      searchPlaceholder={t('tech.dns.searchPlaceholder')}
      defaultSort={{ field: 'name', dir: 'asc' }}
      refetchRef={refetchRef}
    />
  );
}
