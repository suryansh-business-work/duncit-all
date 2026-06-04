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
import type { CrmCallPrompt } from '../../api/call.gql';

interface Props {
  prompts: CrmCallPrompt[];
  onEdit: (prompt: CrmCallPrompt) => void;
  onDelete: (prompt: CrmCallPrompt) => void;
}

/** Read-only table of Static Content prompts with edit / delete actions. */
export default function CallPromptsTable({ prompts, onEdit, onDelete }: Props) {
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Name</TableCell>
          <TableCell>Language</TableCell>
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
            <TableCell>{p.language}</TableCell>
            <TableCell>
              <Chip size="small" color={p.is_active ? 'success' : 'default'} label={p.is_active ? 'Active' : 'Inactive'} />
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
