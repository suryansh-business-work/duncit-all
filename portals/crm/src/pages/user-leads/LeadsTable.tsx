import {
  Checkbox,
  Chip,
  IconButton,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';

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

type SortDir = 'asc' | 'desc';
interface Props {
  rows: readonly LeadRow[];
  sortBy: string;
  sortDir: SortDir;
  onSort: (field: string) => void;
  onRowClick: (id: string) => void;
  selected: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onToggleAll: (checked: boolean) => void;
  onEdit: (lead: LeadRow) => void;
  onDelete: (lead: LeadRow) => void;
}

const COLS: { field: string; label: string; sortable: boolean }[] = [
  { field: 'name', label: 'Name', sortable: true },
  { field: 'phone', label: 'Phone', sortable: true },
  { field: 'community', label: 'Community', sortable: false },
  { field: 'groups', label: 'Groups', sortable: false },
  { field: 'imported_at', label: 'Imported', sortable: true },
];

const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-IN') : '—');
const waWebUrl = (phone: string) => `https://web.whatsapp.com/send?phone=${phone}`;
const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

/** Names from a community/group provenance list, as chips (or an em dash). */
function SourceChips({ refs }: Readonly<{ refs?: SourceRef[] }>) {
  if (!refs || refs.length === 0) {
    return <span>—</span>;
  }
  return (
    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
      {refs.map((r) => (
        <Chip key={r.jid} size="small" variant="outlined" label={r.name || r.jid} />
      ))}
    </Stack>
  );
}

export default function LeadsTable({
  rows,
  sortBy,
  sortDir,
  onSort,
  onRowClick,
  selected,
  onToggle,
  onToggleAll,
  onEdit,
  onDelete,
}: Readonly<Props>) {
  const selectedOnPage = rows.filter((r) => selected.has(r.id)).length;
  const allSelected = rows.length > 0 && selectedOnPage === rows.length;
  const someSelected = selectedOnPage > 0 && !allSelected;

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell padding="checkbox">
            <Checkbox
              size="small"
              checked={allSelected}
              indeterminate={someSelected}
              onChange={(e) => onToggleAll(e.target.checked)}
              inputProps={{ 'aria-label': 'Select all leads on this page' }}
            />
          </TableCell>
          {COLS.map((c) => (
            <TableCell key={c.field} sortDirection={sortBy === c.field ? sortDir : false}>
              {c.sortable ? (
                <TableSortLabel
                  active={sortBy === c.field}
                  direction={sortBy === c.field ? sortDir : 'asc'}
                  onClick={() => onSort(c.field)}
                >
                  {c.label}
                </TableSortLabel>
              ) : (
                c.label
              )}
            </TableCell>
          ))}
          <TableCell align="right">Actions</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((lead) => (
          <TableRow key={lead.id} hover sx={{ cursor: 'pointer' }} onClick={() => onRowClick(lead.id)}>
            <TableCell padding="checkbox" onClick={stop}>
              <Checkbox
                size="small"
                checked={selected.has(lead.id)}
                onChange={() => onToggle(lead.id)}
                inputProps={{ 'aria-label': `Select ${lead.name || lead.phone}` }}
              />
            </TableCell>
            <TableCell>{lead.name || '—'}</TableCell>
            <TableCell onClick={stop}>
              <Link
                href={waWebUrl(lead.phone)}
                target="_blank"
                rel="noopener"
                underline="hover"
                sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: '#075E54', fontWeight: 600 }}
              >
                <WhatsAppIcon sx={{ fontSize: 16, color: '#25D366' }} />
                +{lead.phone}
              </Link>
            </TableCell>
            <TableCell><SourceChips refs={lead.source_communities} /></TableCell>
            <TableCell><SourceChips refs={lead.source_groups} /></TableCell>
            <TableCell>{fmtDate(lead.imported_at)}</TableCell>
            <TableCell align="right" onClick={stop}>
              <Tooltip title="Edit">
                <IconButton size="small" onClick={() => onEdit(lead)} aria-label="Edit lead">
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton size="small" color="error" onClick={() => onDelete(lead)} aria-label="Delete lead">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
