import {
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Switch,
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

interface Props {
  loading: boolean;
  flags: any[];
  onToggle: (f: any) => void;
  onEdit: (f: any) => void;
  onRemove: (f: any) => void;
}

export default function FeatureFlagsTable({
  loading,
  flags,
  onToggle,
  onEdit,
  onRemove,
}: Props) {
  return (
    <Card>
      <CardContent sx={{ p: 0 }}>
        {loading ? (
          <Stack alignItems="center" sx={{ p: 4 }}>
            <CircularProgress />
          </Stack>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Enabled</TableCell>
                <TableCell>Key</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {flags.map((f: any) => (
                <TableRow key={f.id} hover>
                  <TableCell>
                    <Switch checked={!!f.enabled} onChange={() => onToggle(f)} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {f.key}
                    </Typography>
                  </TableCell>
                  <TableCell>{f.name}</TableCell>
                  <TableCell sx={{ maxWidth: 360 }}>
                    <Typography variant="body2" color="text.secondary">
                      {f.description || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {f.is_system ? (
                      <Chip size="small" label="System" color="info" />
                    ) : (
                      <Chip size="small" label="Custom" />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => onEdit(f)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={f.is_system ? 'System (locked)' : 'Delete'}>
                      <span>
                        <IconButton
                          size="small"
                          disabled={f.is_system}
                          onClick={() => onRemove(f)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
