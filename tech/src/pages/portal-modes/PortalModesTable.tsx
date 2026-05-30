import {
  Box,
  Chip,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { PortalModeRow, PortalModeState } from './queries';

interface Props {
  rows: PortalModeRow[];
  busyKey?: string | null;
  onChange: (row: PortalModeRow, mode: PortalModeState) => void;
}

const KIND_LABEL: Record<string, string> = { PORTAL: 'Portal', WEBSITE: 'Website', APP: 'App' };

export default function PortalModesTable({ rows, busyKey, onChange }: Props) {
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Portal name</TableCell>
            <TableCell align="center">Maintenance</TableCell>
            <TableCell align="center">Development</TableCell>
            <TableCell align="right">Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => {
            const disabled = busyKey === row.key;
            const isMaint = row.mode === 'MAINTENANCE';
            const isDev = row.mode === 'DEVELOPMENT';
            return (
              <TableRow key={row.key} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={700}>{row.name}</Typography>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Typography variant="caption" color="text.secondary">{row.key}</Typography>
                    <Chip size="small" variant="outlined" label={KIND_LABEL[row.kind] ?? row.kind} />
                  </Stack>
                </TableCell>
                <TableCell align="center">
                  <Switch
                    color="warning"
                    checked={isMaint}
                    disabled={disabled}
                    onChange={(e) => onChange(row, e.target.checked ? 'MAINTENANCE' : 'LIVE')}
                  />
                </TableCell>
                <TableCell align="center">
                  <Switch
                    color="info"
                    checked={isDev}
                    disabled={disabled}
                    onChange={(e) => onChange(row, e.target.checked ? 'DEVELOPMENT' : 'LIVE')}
                  />
                </TableCell>
                <TableCell align="right">
                  <Chip
                    size="small"
                    color={isMaint ? 'warning' : isDev ? 'info' : 'success'}
                    label={isMaint ? 'Maintenance' : isDev ? 'Development' : 'Live'}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );
}
