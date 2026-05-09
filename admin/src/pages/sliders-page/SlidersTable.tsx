import {
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { SCOPES } from './queries';

interface Props {
  loading: boolean;
  hasData: boolean;
  rows: any[];
  locations: any[];
  onEdit: (s: any) => void;
  onRemove: (s: any) => void;
}

export default function SlidersTable({
  loading,
  hasData,
  rows,
  locations,
  onEdit,
  onRemove,
}: Props) {
  const locName = (id?: string | null) =>
    locations.find((l: any) => l.id === id)?.location_name ?? '—';

  const scopeChip = (s: any) => {
    const meta = SCOPES.find((x) => x.value === s.scope);
    let label = meta?.label ?? s.scope;
    if (s.scope === 'LOCATION') label = `${meta?.label} · ${locName(s.location_id)}`;
    if (s.scope === 'ZONE')
      label = `${meta?.label} · ${locName(s.location_id)} / ${s.zone_name}`;
    return (
      <Chip
        size="small"
        icon={meta?.icon}
        label={label}
        color={
          s.scope === 'GLOBAL' ? 'primary' : s.scope === 'LOCATION' ? 'info' : 'secondary'
        }
        variant="outlined"
      />
    );
  };

  return (
    <Card>
      <CardContent sx={{ p: 0 }}>
        {loading && !hasData ? (
          <Stack alignItems="center" sx={{ p: 4 }}>
            <CircularProgress />
          </Stack>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Preview</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Scope</TableCell>
                <TableCell>Link</TableCell>
                <TableCell>Order</TableCell>
                <TableCell>Window</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((s: any) => (
                <TableRow key={s.id} hover>
                  <TableCell>
                    <Avatar
                      variant="rounded"
                      src={s.media_type === 'IMAGE' ? s.media_url : undefined}
                      sx={{ width: 56, height: 36 }}
                    >
                      {s.title[0]}
                    </Avatar>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {s.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {s.slider_id}
                    </Typography>
                  </TableCell>
                  <TableCell>{scopeChip(s)}</TableCell>
                  <TableCell>
                    {s.link_url ? (
                      <Typography
                        variant="caption"
                        sx={{ maxWidth: 220, display: 'inline-block', wordBreak: 'break-all' }}
                      >
                        {s.link_url}
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        —
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{s.sort_order}</TableCell>
                  <TableCell>
                    <Typography variant="caption" display="block">
                      {s.starts_at ? new Date(s.starts_at).toLocaleDateString() : '—'} →{' '}
                      {s.ends_at ? new Date(s.ends_at).toLocaleDateString() : '∞'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={s.is_active ? 'Active' : 'Inactive'}
                      color={s.is_active ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => onEdit(s)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => onRemove(s)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8}>
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        No sliders yet.
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
