import {
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
} from '@mui/material';

export interface LeadRow {
  id: string;
  name: string;
  phone: string;
  source_communities?: { jid: string; name: string }[];
  source_groups?: { jid: string; name: string }[];
  imported_at?: string | null;
}

type SortDir = 'asc' | 'desc';
interface Props {
  rows: readonly LeadRow[];
  sortBy: string;
  sortDir: SortDir;
  onSort: (field: string) => void;
  onRowClick: (id: string) => void;
}

const COLS: { field: string; label: string; sortable: boolean }[] = [
  { field: 'name', label: 'Name', sortable: true },
  { field: 'phone', label: 'Phone', sortable: true },
  { field: 'sources', label: 'Sources', sortable: false },
  { field: 'imported_at', label: 'Imported', sortable: true },
];

const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-IN') : '—');

export default function LeadsTable({ rows, sortBy, sortDir, onSort, onRowClick }: Readonly<Props>) {
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
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
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((lead) => (
          <TableRow key={lead.id} hover sx={{ cursor: 'pointer' }} onClick={() => onRowClick(lead.id)}>
            <TableCell>{lead.name || '—'}</TableCell>
            <TableCell>+{lead.phone}</TableCell>
            <TableCell>
              <Stack direction="row" spacing={0.5}>
                {(lead.source_groups?.length ?? 0) > 0 && (
                  <Chip size="small" label={`${lead.source_groups!.length} groups`} />
                )}
                {(lead.source_communities?.length ?? 0) > 0 && (
                  <Chip size="small" color="primary" variant="outlined" label={`${lead.source_communities!.length} communities`} />
                )}
              </Stack>
            </TableCell>
            <TableCell>{fmtDate(lead.imported_at)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
