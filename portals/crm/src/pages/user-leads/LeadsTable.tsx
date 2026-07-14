import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Chip, IconButton, Link, Stack, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';

export interface SourceRef {
  jid: string;
  name: string;
}
export interface LeadRow {
  id: string;
  name: string;
  phone: string;
  source_communities?: SourceRef[];
  source_groups?: SourceRef[];
  imported_at?: string | null;
}

interface Props {
  fetchRows: TableFetch<LeadRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
  onRowClick: (id: string) => void;
  onEdit: (lead: LeadRow) => void;
  onDelete: (lead: LeadRow) => void;
}

const getLeadRowId = (lead: LeadRow) => lead.id;
const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-IN') : '—');
const waWebUrl = (phone: string) => `https://web.whatsapp.com/send?phone=${phone}`;
const sourceNames = (refs?: SourceRef[]) => (refs ?? []).map((r) => r.name || r.jid).join(', ');

/** Names from a community/group provenance list, as chips (or an em dash). */
function SourceChips({ refs }: Readonly<{ refs?: SourceRef[] }>) {
  if (!refs || refs.length === 0) {
    return <span>—</span>;
  }
  return (
    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap component="span">
      {refs.map((r) => (
        <Chip key={r.jid} size="small" variant="outlined" label={r.name || r.jid} />
      ))}
    </Stack>
  );
}

const renderPhone = (lead: LeadRow) => (
  <Link
    href={waWebUrl(lead.phone)}
    target="_blank"
    rel="noopener"
    underline="hover"
    sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: 'success.dark', fontWeight: 600 }}
  >
    <WhatsAppIcon sx={{ fontSize: 16, color: 'success.main' }} />
    +{lead.phone}
  </Link>
);

const renderCommunities = (lead: LeadRow) => <SourceChips refs={lead.source_communities} />;
const renderGroups = (lead: LeadRow) => <SourceChips refs={lead.source_groups} />;
const importedValue = (lead: LeadRow) => fmtDate(lead.imported_at);

/** WhatsApp user leads on @duncit/table — search/sort/paging stay server-side (waUserLeads). */
export default function LeadsTable({
  fetchRows,
  refetchRef,
  toolbarActions,
  onRowClick,
  onEdit,
  onDelete,
}: Readonly<Props>) {
  const columns = useMemo<DuncitColumn<LeadRow>[]>(() => {
    const renderActions = (lead: LeadRow) => (
      <Stack direction="row" justifyContent="flex-end" component="span">
        <Tooltip title="Edit">
          <IconButton size="small" aria-label="Edit lead" onClick={() => onEdit(lead)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton size="small" color="error" aria-label="Delete lead" onClick={() => onDelete(lead)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    );
    return [
      { field: 'name', headerName: 'Name', flex: 1, minWidth: 160, valueGetter: (lead) => lead.name || '—' },
      { field: 'phone', headerName: 'Phone', minWidth: 170, cellRenderer: renderPhone, valueGetter: (lead) => `+${lead.phone}` },
      {
        field: 'source_communities',
        headerName: 'Community',
        sortable: false,
        minWidth: 160,
        cellRenderer: renderCommunities,
        valueGetter: (lead) => sourceNames(lead.source_communities),
      },
      {
        field: 'source_groups',
        headerName: 'Groups',
        sortable: false,
        minWidth: 160,
        cellRenderer: renderGroups,
        valueGetter: (lead) => sourceNames(lead.source_groups),
      },
      { field: 'imported_at', headerName: 'Imported', width: 130, valueGetter: importedValue },
      { field: 'actions', headerName: 'Actions', sortable: false, width: 110, cellRenderer: renderActions },
    ];
  }, [onEdit, onDelete]);

  return (
    <DuncitTable<LeadRow>
      tableId="crm-user-leads"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getLeadRowId}
      onRowClick={(lead) => onRowClick(lead.id)}
      toolbarActions={toolbarActions}
      emptyText='No WhatsApp leads yet. Add one with "New", or "Import" an Excel/CSV.'
      defaultSort={{ field: 'imported_at', dir: 'desc' }}
      searchPlaceholder="Search by name or phone…"
      refetchRef={refetchRef}
    />
  );
}
