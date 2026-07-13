import {
  Box,
  Chip,
  Link,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import type { PortalModeRow, PortalModeState } from './queries';

interface Props {
  rows: PortalModeRow[];
  busyKey?: string | null;
  onChange: (row: PortalModeRow, mode: PortalModeState) => void;
}

const KIND_LABEL: Record<string, string> = { PORTAL: 'Portal', WEBSITE: 'Website', APP: 'App' };

type StatusMeta = { color: 'warning' | 'info' | 'success'; label: string };

const statusMeta = (isMaint: boolean, isDev: boolean): StatusMeta => {
  if (isMaint) return { color: 'warning', label: 'Maintenance' };
  if (isDev) return { color: 'info', label: 'Development' };
  return { color: 'success', label: 'Live' };
};

export default function PortalModesTable({ rows, busyKey, onChange }: Readonly<Props>) {
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Portal name</TableCell>
            <TableCell>Link</TableCell>
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
            const status = statusMeta(isMaint, isDev);
            return (
              <TableRow key={row.key} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={700}>{row.name}</Typography>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Typography variant="caption" color="text.secondary">{row.key}</Typography>
                    <Chip size="small" variant="outlined" label={KIND_LABEL[row.kind] ?? row.kind} />
                  </Stack>
                </TableCell>
                <TableCell>
                  {row.url ? (
                    <Link
                      href={row.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="body2"
                      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}
                    >
                      {row.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                      <OpenInNewIcon sx={{ fontSize: 14 }} />
                    </Link>
                  ) : (
                    <Typography variant="caption" color="text.secondary">—</Typography>
                  )}
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
                    color={status.color}
                    label={status.label}
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
