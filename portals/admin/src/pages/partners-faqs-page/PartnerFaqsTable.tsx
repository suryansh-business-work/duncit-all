import { Alert, Box, Card, CardContent, Chip, CircularProgress, IconButton, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

const TOPIC_LABELS: Record<string, string> = { VENUE: 'Venue', HOST: 'Host', PRODUCTS: 'Products' };

interface Props {
  loading: boolean;
  items: any[];
  onEdit: (item: any) => void;
  onDelete: (item: any) => void;
}

export default function PartnerFaqsTable({ loading, items, onEdit, onDelete }: Readonly<Props>) {
  const emptyOrTable = items.length === 0 ? (
    <Alert severity="info" sx={{ m: 2 }}>No partner FAQs yet. Create the first one.</Alert>
  ) : (
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Question</TableCell>
            <TableCell>Topic</TableCell>
            <TableCell align="center">Sort</TableCell>
            <TableCell align="center">Active</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} hover>
              <TableCell>
                <Typography variant="body2" fontWeight={600}>{item.question}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.answer}</Typography>
              </TableCell>
              <TableCell><Chip size="small" label={TOPIC_LABELS[item.partner_topic] || item.partner_topic} /></TableCell>
              <TableCell align="center">{item.sort_order}</TableCell>
              <TableCell align="center"><Chip size="small" color={item.is_active ? 'success' : 'default'} label={item.is_active ? 'Active' : 'Hidden'} /></TableCell>
              <TableCell align="right">
                <Tooltip title="Edit"><IconButton size="small" onClick={() => onEdit(item)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => onDelete(item)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );

  return (
    <Card>
      <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
        {loading ? (
          <Box sx={{ p: 6, textAlign: 'center' }}><CircularProgress /></Box>
        ) : (
          emptyOrTable
        )}
      </CardContent>
    </Card>
  );
}