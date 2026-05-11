import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ImageIcon from '@mui/icons-material/Image';

interface Props {
  items: any[];
  loading: boolean;
  onEdit: (item: any) => void;
  onDelete: (item: any) => void;
}

export default function WebsiteContentTable({ items, loading, onEdit, onDelete }: Props) {
  if (loading && items.length === 0) {
    return <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress /></Stack>;
  }

  if (items.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">No entries yet.</Typography>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Entry</TableCell>
            <TableCell>Category</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Published</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} hover>
              <TableCell>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar src={item.image_url || undefined} variant="rounded">
                    <ImageIcon fontSize="small" />
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2" noWrap>{item.title}</Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      /{item.slug}
                    </Typography>
                  </Box>
                </Stack>
              </TableCell>
              <TableCell>{item.category || '—'}</TableCell>
              <TableCell>
                <Chip
                  size="small"
                  label={item.is_published ? 'Published' : 'Draft'}
                  color={item.is_published ? 'success' : 'default'}
                />
              </TableCell>
              <TableCell>
                {item.published_at ? new Date(item.published_at).toLocaleDateString() : '—'}
              </TableCell>
              <TableCell align="right">
                <IconButton size="small" onClick={() => onEdit(item)} aria-label="edit">
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" color="error" onClick={() => onDelete(item)} aria-label="delete">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}