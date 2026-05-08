import {
  Alert,
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
import LinkIcon from '@mui/icons-material/Link';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

interface Props {
  loading: boolean;
  hasData: boolean;
  items: any[];
  onEdit: (it: any) => void;
  onDelete: (it: any) => void;
  onCopySlug: (slug: string) => void;
}

export default function PoliciesTable({
  loading,
  hasData,
  items,
  onEdit,
  onDelete,
  onCopySlug,
}: Props) {
  return (
    <Card>
      <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
        {loading && !hasData ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <CircularProgress />
          </Box>
        ) : items.length === 0 ? (
          <Alert severity="info" sx={{ m: 2 }}>
            No policies yet. Create one — e.g. "Privacy Policy" with slug{' '}
            <code>privacy-policy</code>.
          </Alert>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Slug</TableCell>
                  <TableCell align="center">Sort</TableCell>
                  <TableCell align="center">Active</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((it) => (
                  <TableRow key={it.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {it.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Updated {new Date(it.updated_at).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Chip
                          size="small"
                          icon={<LinkIcon fontSize="small" />}
                          label={it.slug}
                          variant="outlined"
                        />
                        <Tooltip title="Copy slug">
                          <IconButton size="small" onClick={() => onCopySlug(it.slug)}>
                            <ContentCopyIcon fontSize="inherit" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                    <TableCell align="center">{it.sort_order}</TableCell>
                    <TableCell align="center">
                      <Chip
                        size="small"
                        color={it.is_active ? 'success' : 'default'}
                        label={it.is_active ? 'Active' : 'Hidden'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => onEdit(it)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => onDelete(it)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
