import {
  Chip,
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
import type { AiPrompt } from './queries';

interface Props {
  prompts: AiPrompt[];
  onEdit: (prompt: AiPrompt) => void;
  onDelete: (prompt: AiPrompt) => void;
}

/** Prompt Library table — name/category/model/token size/status with row actions. */
export default function PromptsTable({ prompts, onEdit, onDelete }: Props) {
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Name</TableCell>
          <TableCell>Category</TableCell>
          <TableCell>Model</TableCell>
          <TableCell align="right">Tokens</TableCell>
          <TableCell>Status</TableCell>
          <TableCell align="right">Actions</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {prompts.map((p) => (
          <TableRow key={p.id} hover>
            <TableCell>
              <Typography variant="body2" fontWeight={700}>
                {p.name}
              </Typography>
              {p.description && (
                <Typography variant="caption" color="text.secondary">
                  {p.description}
                </Typography>
              )}
            </TableCell>
            <TableCell>
              <Chip size="small" variant="outlined" label={p.category} />
            </TableCell>
            <TableCell>
              <Typography variant="body2" color={p.target_model ? 'text.primary' : 'text.disabled'}>
                {p.target_model || '—'}
              </Typography>
            </TableCell>
            <TableCell align="right">
              <Tooltip title="Estimated token size of the prompt content">
                <Chip size="small" color="primary" variant="outlined" label={`≈ ${p.token_count}`} />
              </Tooltip>
            </TableCell>
            <TableCell>
              <Chip
                size="small"
                color={p.is_active ? 'success' : 'default'}
                label={p.is_active ? 'Active' : 'Inactive'}
              />
            </TableCell>
            <TableCell align="right">
              <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                <Tooltip title="Edit">
                  <IconButton size="small" onClick={() => onEdit(p)} aria-label={`Edit ${p.name}`}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton size="small" color="error" onClick={() => onDelete(p)} aria-label={`Delete ${p.name}`}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
