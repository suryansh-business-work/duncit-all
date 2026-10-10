import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, LinearProgress, Stack, Typography } from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { fireAndForget, logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import { DuncitTable, actionsColumn, activeChipColumn, clientTableFetch, dateColumn, type DuncitColumn } from '@duncit/table';
import { CHALLENGE_CATEGORY_MAPPINGS, CHALLENGE_TOOLS, type MappingRow } from '../../graphql/engine';
import { useCategoryPaths } from '../../lib/categoryPaths';
import MappingDialog from './MappingDialog';

type Row = MappingRow & { path: string; tool_names: string };

const rowId = (r: Row) => r.category_id;
const searchOf = (r: Row) => `${r.path} ${r.tool_names}`;

/** Challenge Portal > Category Mapping: which tools each sub-category runs. */
export default function MappingPage() {
  const { t } = useTranslation();
  const mappings = useQuery(CHALLENGE_CATEGORY_MAPPINGS, { fetchPolicy: 'cache-and-network' });
  const tools = useQuery(CHALLENGE_TOOLS);
  const { labelOf } = useCategoryPaths();
  const [editing, setEditing] = useState<{ id: string | null; label?: string } | null>(null);

  const rows = useMemo<Row[]>(() => {
    const toolName = new Map((tools.data?.challengeTools ?? []).map((tool) => [tool.id, tool.name]));
    return (mappings.data?.challengeCategoryMappings ?? []).map((m) => ({
      ...m,
      path: labelOf.get(m.category_id) ?? m.category_name,
      tool_names: m.allowed_tool_ids.map((id) => toolName.get(id) ?? '').filter(Boolean).join(', '),
    }));
  }, [mappings.data, tools.data, labelOf]);

  const columns = useMemo<DuncitColumn<Row>[]>(
    () => [
      { field: 'path', headerName: t('challenge.mapping.colCategory'), type: 'text', flex: 1, minWidth: 240 },
      activeChipColumn<Row>({ field: 'enabled', width: 130, outlineInactive: true }),
      { field: 'tool_names', headerName: t('challenge.mapping.colTools'), type: 'text', flex: 1, minWidth: 240 },
      dateColumn<Row>({ field: 'updated_at', hide: false }),
      actionsColumn<Row>({
        onEdit: (r) => setEditing({ id: r.category_id, label: r.path }),
        edit: { ariaLabel: t('challenge.mapping.editAria') },
      }),
    ],
    [t]
  );
  const fetchRows = useMemo(() => clientTableFetch<Row>(rows, searchOf, columns), [rows, columns]);

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
        <AccountTreeIcon color="primary" />
        <Typography component="h1" variant="h5" sx={{ fontWeight: 800 }}>
          {t('challenge.mapping.title')}
        </Typography>
      </Stack>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('challenge.mapping.subtitle')}
      </Typography>
      {mappings.loading && !mappings.data && <LinearProgress aria-label={t('challenge.mapping.loading')} />}
      {mappings.error && !mappings.data && <Alert severity="error">{t('challenge.mapping.loadError')}</Alert>}
      {mappings.data && (
        <DuncitTable<Row>
          ariaLabel={t('shell.nav.categoryMapping')}
          tableId="challenge-portal-mappings"
          columns={columns}
          fetchRows={fetchRows}
          getRowId={rowId}
          emptyText={t('challenge.mapping.empty')}
          searchPlaceholder={t('challenge.mapping.search')}
          defaultSort={{ field: 'path', dir: 'asc' }}
          toolbarActions={
            <DuncitButton size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setEditing({ id: null })}>
              {t('challenge.mapping.configure')}
            </DuncitButton>
          }
        />
      )}
      <MappingDialog
        open={!!editing}
        categoryId={editing?.id ?? null}
        categoryLabel={editing?.label}
        onClose={() => setEditing(null)}
        onSaved={() => fireAndForget(mappings.refetch(), logs.portal['challenge-portal'], 'MappingPage', 'refetch')}
      />
    </Stack>
  );
}
