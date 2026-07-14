import { useMemo, type MutableRefObject } from 'react';
import { Chip, IconButton, Tooltip, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import type { SurveyRow } from './queries';

const scopeLabel = (r: SurveyRow) =>
  [r.super_category_name, r.category_name, r.sub_category_name].filter(Boolean).join(' › ') || 'Kind default';

interface Props {
  fetchRows: TableFetch<SurveyRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  onOpen: (r: SurveyRow) => void;
  onDelete: (r: SurveyRow) => void;
}

const getSurveyRowId = (r: SurveyRow) => r.id;

const renderTitle = (r: SurveyRow) => (r.title ? <span>{r.title}</span> : <em>Untitled</em>);

const renderKind = (r: SurveyRow) => <Chip size="small" label={r.kind} variant="outlined" />;

const renderActiveChip = (r: SurveyRow) => (
  <Chip size="small" color={r.is_active ? 'success' : 'default'} label={r.is_active ? 'Active' : 'Off'} variant="outlined" />
);

const updatedValue = (r: SurveyRow) =>
  r.updated_at ? new Date(r.updated_at).toLocaleString() : '—';

export default function SurveysTable({ fetchRows, refetchRef, onOpen, onDelete }: Readonly<Props>) {
  const columns = useMemo<DuncitColumn<SurveyRow>[]>(() => {
    const renderActions = (r: SurveyRow) => (
      <>
        <Tooltip title="Edit">
          <IconButton size="small" onClick={() => onOpen(r)}><EditIcon fontSize="small" /></IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton size="small" color="error" onClick={() => onDelete(r)}><DeleteIcon fontSize="small" /></IconButton>
        </Tooltip>
      </>
    );
    return [
      {
        field: 'title',
        headerName: 'Title',
        flex: 1,
        minWidth: 200,
        cellRenderer: renderTitle,
        valueGetter: (r) => r.title || 'Untitled',
      },
      {
        field: 'kind',
        headerName: 'Kind',
        width: 110,
        cellRenderer: renderKind,
        valueGetter: (r) => r.kind,
      },
      { field: 'scope', headerName: 'Scope', sortable: false, minWidth: 200, valueGetter: scopeLabel },
      {
        field: 'questions',
        headerName: 'Questions',
        sortable: false,
        width: 110,
        valueGetter: (r) => r.questions.length,
      },
      {
        field: 'is_active',
        headerName: 'Active',
        width: 110,
        filter: { type: 'boolean' },
        cellRenderer: renderActiveChip,
        valueGetter: (r) => (r.is_active ? 'Active' : 'Off'),
      },
      {
        field: 'updated_at',
        headerName: 'Updated',
        hide: true,
        minWidth: 170,
        filter: { type: 'date' },
        valueGetter: updatedValue,
      },
      { field: 'actions', headerName: 'Actions', sortable: false, width: 110, cellRenderer: renderActions },
    ];
  }, [onOpen, onDelete]);

  return (
    <DuncitTable<SurveyRow>
      tableId="onboarding-surveys"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getSurveyRowId}
      onRowClick={onOpen}
      emptyText="No category-specific surveys yet. Create one with New survey."
      defaultSort={{ field: 'updated_at', dir: 'desc' }}
      searchPlaceholder="Search title"
      refetchRef={refetchRef}
    />
  );
}
