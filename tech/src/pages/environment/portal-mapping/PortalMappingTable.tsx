import {
  Box,
  Button,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import TuneIcon from '@mui/icons-material/Tune';
import type { EnvEntry } from '../queries';
import type { PortalListItem } from '../portal-env-queries';

const KIND_LABEL: Record<string, string> = { PORTAL: 'Portal', WEBSITE: 'Website', APP: 'App' };

export interface PortalRow {
  portal: PortalListItem;
  entries: EnvEntry[];
}

interface Props {
  rows: PortalRow[];
  onInfo: (row: PortalRow) => void;
  onAssign: (portal: PortalListItem) => void;
}

/** Tabular view of every portal and how many env entries it has assigned. */
export default function PortalMappingTable({ rows, onInfo, onAssign }: Props) {
  if (!rows.length) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
        No portals match your search.
      </Typography>
    );
  }
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Portal</TableCell>
            <TableCell>Type</TableCell>
            <TableCell align="center">Assigned configs</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.portal.key} hover>
              <TableCell>
                <Typography variant="body2" fontWeight={700}>{row.portal.name}</Typography>
                <Typography variant="caption" color="text.secondary">{row.portal.key}</Typography>
              </TableCell>
              <TableCell>
                <Chip size="small" variant="outlined" label={KIND_LABEL[row.portal.kind] ?? row.portal.kind} />
              </TableCell>
              <TableCell align="center">
                <Chip
                  size="small"
                  color={row.entries.length ? 'primary' : 'default'}
                  variant={row.entries.length ? 'filled' : 'outlined'}
                  label={row.entries.length}
                />
              </TableCell>
              <TableCell align="right">
                <Tooltip title="Show assigned configs">
                  <span>
                    <IconButton size="small" onClick={() => onInfo(row)} disabled={!row.entries.length}>
                      <InfoOutlinedIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Button size="small" startIcon={<TuneIcon />} onClick={() => onAssign(row.portal)}>
                  Assign
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
