import {
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

interface Props {
  loading: boolean;
  roles: any[];
  onEdit: (r: any) => void;
  onDelete: (r: any) => void;
}

export default function RolesTable({ loading, roles, onEdit, onDelete }: Props) {
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
                <TableCell>Key</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {roles.map((r: any) => (
                <TableRow key={r.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {r.key}
                    </Typography>
                  </TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell sx={{ maxWidth: 280 }}>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {r.description || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {r.is_system ? (
                      <Chip size="small" label="System" color="info" />
                    ) : (
                      <Chip size="small" label="Custom" />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => onEdit(r)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={r.is_system ? 'System (locked)' : 'Delete'}>
                      <span>
                        <IconButton
                          size="small"
                          disabled={r.is_system}
                          onClick={() => onDelete(r)}
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
