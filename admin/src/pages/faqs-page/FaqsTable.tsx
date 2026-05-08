import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
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
  items: any[];
  onEdit: (it: any) => void;
  onDelete: (it: any) => void;
}

export default function FaqsTable({ loading, items, onEdit, onDelete }: Props) {
  return (
    <Card>
      <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
        {loading ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <CircularProgress />
          </Box>
        ) : items.length === 0 ? (
          <Alert severity="info" sx={{ m: 2 }}>
            No FAQs yet. Create the first one.
          </Alert>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Question</TableCell>
                  <TableCell>Super Category</TableCell>
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
                        {it.question}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {it.answer}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {it.super_category ? (
                        <Chip
                          size="small"
                          label={it.super_category.name}
                          variant="outlined"
                        />
                      ) : (
                        <Chip size="small" label="General" />
                      )}
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
