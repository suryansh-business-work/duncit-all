import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Chip, Switch, Typography } from '@mui/material';
import { DuncitTable, actionsColumn, type DuncitColumn, type TableFetch } from '@duncit/table';
import type { FeatureFlagRow } from './queries';
import { useTranslation } from '@duncit/app-settings';

type Translate = ReturnType<typeof useTranslation>['t'];

const getFlagRowId = (f: FeatureFlagRow) => f.id;

const renderKey = (f: FeatureFlagRow) => (
  <Typography variant="body2" fontWeight={600}>{f.key}</Typography>
);

const renderDescription = (f: FeatureFlagRow) => (
  <Typography variant="body2" color="text.secondary">{f.description || '—'}</Typography>
);

const renderType = (f: FeatureFlagRow, t: Translate) =>
  f.is_system ? <Chip size="small" label={t('shell.nav.system')} color="info" /> : <Chip size="small" label={t('tech.featureFlags.custom')} />;
const typeValue = (f: FeatureFlagRow) => (f.is_system ? 'System' : 'Custom');

const enabledValue = (f: FeatureFlagRow) => (f.enabled ? 'Yes' : 'No');

interface Props {
  fetchRows: TableFetch<FeatureFlagRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
  onToggle: (f: FeatureFlagRow) => void;
  onEdit: (f: FeatureFlagRow) => void;
  onRemove: (f: FeatureFlagRow) => void;
}

export default function FeatureFlagsTable({
  fetchRows,
  refetchRef,
  toolbarActions,
  onToggle,
  onEdit,
  onRemove,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<FeatureFlagRow>[]>(() => {
    const renderEnabled = (f: FeatureFlagRow) => (
      <Switch size="small" checked={f.enabled} onChange={() => onToggle(f)} />
    );
    return [
      {
        field: 'enabled',
        headerName: t('tech.featureFlags.enabled'),
        width: 110,
        filter: { type: 'boolean' },
        cellRenderer: renderEnabled,
        valueGetter: enabledValue,
      },
      { field: 'key', headerName: t('tech.featureFlags.key'), flex: 1, minWidth: 160, cellRenderer: renderKey },
      { field: 'name', headerName: t('shell.common.name'), flex: 1, minWidth: 160 },
      {
        field: 'description',
        headerName: t('shell.common.description'),
        flex: 1.4,
        minWidth: 200,
        cellRenderer: renderDescription,
      },
      {
        field: 'is_system',
        headerName: t('shell.common.type'),
        width: 110,
        filter: { type: 'boolean' },
        cellRenderer: (f: FeatureFlagRow) => renderType(f, t),
        valueGetter: typeValue,
      },
      actionsColumn<FeatureFlagRow>({
        width: 120,
        onEdit,
        onDelete: onRemove,
        delete: { color: 'default', disabled: (f) => f.is_system, disabledTitle: 'System (locked)' },
      }),
    ];
  }, [onEdit, onRemove, onToggle]);

  return (
    <DuncitTable<FeatureFlagRow>
      tableId="tech-feature-flags"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getFlagRowId}
      toolbarActions={toolbarActions}
      emptyText='No feature flags yet. Click "New Flag" to create the first one.'
      defaultSort={{ field: 'key', dir: 'asc' }}
      searchPlaceholder="Search key, name or description"
      refetchRef={refetchRef}
    />
  );
}
