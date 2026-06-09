import { IconButton, Switch, TableCell, TableRow, TextField, Tooltip } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';

export interface ManagedEditRow {
  id?: string;
  name: string;
  sort_order: string;
  is_active: boolean;
}

interface Props {
  draft: ManagedEditRow;
  setDraft: (r: ManagedEditRow) => void;
  onSave: () => void;
  onCancel: () => void;
  busy: boolean;
  placeholder: string;
}

/** The add / inline-edit row shared by the managed-option list table. */
export default function ManagedOptionEditRow({ draft, setDraft, onSave, onCancel, busy, placeholder }: Readonly<Props>) {
  return (
    <TableRow>
      <TableCell>
        <TextField
          size="small"
          value={draft.sort_order}
          inputProps={{ inputMode: 'numeric' }}
          onChange={(e) => setDraft({ ...draft, sort_order: e.target.value })}
          sx={{ width: 70 }}
        />
      </TableCell>
      <TableCell>
        <TextField
          size="small"
          fullWidth
          autoFocus
          placeholder={placeholder}
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
      </TableCell>
      <TableCell>
        <Switch checked={draft.is_active} onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })} />
      </TableCell>
      <TableCell align="right">
        <Tooltip title="Save">
          <span>
            <IconButton size="small" color="primary" onClick={onSave} disabled={busy}>
              <SaveIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Cancel">
          <span>
            <IconButton size="small" onClick={onCancel} disabled={busy}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
}
