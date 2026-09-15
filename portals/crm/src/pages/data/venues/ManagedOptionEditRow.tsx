import { Switch, TableCell, TableRow, TextField, Tooltip } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';

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
  const { t } = useTranslation();
  return (
    <TableRow>
      <TableCell>
        <TextField
          size="small"
          value={draft.sort_order}
          onChange={(e) => setDraft({ ...draft, sort_order: e.target.value })}
          sx={{ width: 70 }}
          slotProps={{
            htmlInput: { inputMode: 'numeric', 'aria-label': t('shell.common.order') }
          }}
          data-testid="crm-managed-option-order-input"
        />
      </TableCell>
      <TableCell>
        <TextField
          size="small"
          fullWidth
          // eslint-disable-next-line jsx-a11y/no-autofocus -- focus moves into the inline editor the user just opened (WCAG 2.4.3)
          autoFocus
          placeholder={placeholder}
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          slotProps={{ htmlInput: { 'aria-label': t('shell.common.name') } }}
          data-testid="crm-managed-option-name-input"
        />
      </TableCell>
      <TableCell>
        <Switch
          checked={draft.is_active}
          onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
          slotProps={{ input: { 'aria-label': t('crm.common.active') } }}
          data-testid="crm-managed-option-active-input"
        />
      </TableCell>
      <TableCell align="right">
        <Tooltip title={t('shell.common.save')}>
          <span>
            <DuncitIconButton size="small" color="primary" aria-label={t('shell.common.save')} data-testid="crm-managed-option-save" onClick={onSave} disabled={busy}>
              <SaveIcon fontSize="small" />
            </DuncitIconButton>
          </span>
        </Tooltip>
        <Tooltip title={t('shell.common.cancel')}>
          <span>
            <DuncitIconButton size="small" aria-label={t('shell.common.cancel')} data-testid="crm-managed-option-cancel" onClick={onCancel} disabled={busy}>
              <CloseIcon fontSize="small" />
            </DuncitIconButton>
          </span>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
}
