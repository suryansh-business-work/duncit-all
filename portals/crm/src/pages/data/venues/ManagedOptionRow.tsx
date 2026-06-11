import { Chip, IconButton, Stack, Switch, TableCell, TableRow, Tooltip, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import type { CrmManagedOption } from '../../../api/data.gql';

interface Props {
  row: CrmManagedOption;
  busy: boolean;
  disableActions: boolean;
  onToggleActive: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/** Read-only row of the managed-option table (active toggle + edit/delete). */
export default function ManagedOptionRow({ row, busy, disableActions, onToggleActive, onEdit, onDelete }: Readonly<Props>) {
  return (
    <TableRow hover>
      <TableCell>{row.sort_order}</TableCell>
      <TableCell>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" fontWeight={600}>{row.name}</Typography>
          {!row.is_active && <Chip size="small" label="Inactive" color="warning" />}
        </Stack>
      </TableCell>
      <TableCell>
        <Switch checked={row.is_active} onChange={onToggleActive} disabled={busy} />
      </TableCell>
      <TableCell align="right">
        <Tooltip title="Edit">
          <span>
            <IconButton size="small" onClick={onEdit} disabled={disableActions}>
              <EditIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Delete">
          <span>
            <IconButton size="small" color="error" onClick={onDelete} disabled={disableActions}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
}
