import { Chip, Stack, Switch, TableCell, TableRow, Tooltip, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { DuncitIconButton } from '@duncit/buttons';
import type { CrmManagedOption } from '../../../api/data.gql';
import { useTranslation } from '@duncit/shell';

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
  const { t } = useTranslation();
  return (
    <TableRow hover>
      <TableCell>{row.sort_order}</TableCell>
      <TableCell>
        <Stack direction="row" spacing={1} sx={{
          alignItems: "center"
        }}>
          <Typography variant="body2" sx={{
            fontWeight: 600
          }}>{row.name}</Typography>
          {!row.is_active && <Chip size="small" label={t('crm.common.inactive')} color="warning" />}
        </Stack>
      </TableCell>
      <TableCell>
        <Switch checked={row.is_active} onChange={onToggleActive} disabled={busy} />
      </TableCell>
      <TableCell align="right">
        <Tooltip title={t('shell.common.edit')}>
          <span>
            <DuncitIconButton size="small" onClick={onEdit} disabled={disableActions}>
              <EditIcon fontSize="small" />
            </DuncitIconButton>
          </span>
        </Tooltip>
        <Tooltip title={t('shell.common.delete')}>
          <span>
            <DuncitIconButton size="small" color="error" onClick={onDelete} disabled={disableActions}>
              <DeleteIcon fontSize="small" />
            </DuncitIconButton>
          </span>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
}
