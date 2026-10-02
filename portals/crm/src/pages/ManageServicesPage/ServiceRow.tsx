import { Chip, Stack, Switch, TableCell, TableRow, TextField, Tooltip, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { CrmService } from '../../api/crm.types';
import type { EditRow } from './types';

interface Props {
  row: CrmService;
  draft: EditRow | null;
  setDraft: (draft: EditRow) => void;
  saveDraft: () => Promise<void>;
  cancelDraft: () => void;
  startEdit: (row: CrmService) => void;
  setRemoving: (row: CrmService) => void;
  toggleActive: (row: CrmService) => Promise<void>;
  busy: boolean;
}

/** One catalogue row — read-only, or the inline editor when it is the draft. */
export function ServiceRow({
  row,
  draft,
  setDraft,
  saveDraft,
  cancelDraft,
  startEdit,
  setRemoving,
  toggleActive,
  busy,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const editing = draft?.id === row.id;
  return (
    <TableRow hover>
      <TableCell>
        {editing ? (
          <TextField
            size="small"
            value={draft.sort_order}
            onChange={(e) => setDraft({ ...draft, sort_order: e.target.value })}
            sx={{ width: 70 }}
            slotProps={{
              htmlInput: { inputMode: 'numeric', 'aria-label': t('shell.common.order') }
            }}
          />
        ) : (
          row.sort_order
        )}
      </TableCell>
      <TableCell>
        {editing ? (
          <TextField
            size="small"
            fullWidth
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            slotProps={{ htmlInput: { 'aria-label': t('crm.page.serviceName') } }}
          />
        ) : (
          <Stack direction="row" spacing={1} sx={{
            alignItems: "center"
          }}>
            <Typography variant="body2" sx={{
              fontWeight: 600
            }}>
              {row.name}
            </Typography>
            {!row.is_active && <Chip size="small" label={t('crm.common.inactive')} color="warning" />}
          </Stack>
        )}
      </TableCell>
      <TableCell>
        <Switch
          checked={editing ? draft.is_active : row.is_active}
          onChange={(e) => {
            if (editing) {
              setDraft({ ...draft, is_active: e.target.checked });
            } else {
              toggleActive(row);
            }
          }}
          disabled={busy && !editing}
          slotProps={{ input: { 'aria-label': t('shell.a11y.fieldOf', { vars: { field: t('crm.common.active'), name: row.name } }) } }}
        />
      </TableCell>
      <TableCell align="right">
        {editing ? (
          <>
            <Tooltip title={t('shell.common.save')}>
              <span>
                <DuncitIconButton size="small" color="primary" aria-label={t('shell.common.save')} onClick={saveDraft} disabled={busy}>
                  <SaveIcon fontSize="small" />
                </DuncitIconButton>
              </span>
            </Tooltip>
            <Tooltip title={t('shell.common.cancel')}>
              <span>
                <DuncitIconButton size="small" aria-label={t('shell.common.cancel')} onClick={cancelDraft} disabled={busy}>
                  <CloseIcon fontSize="small" />
                </DuncitIconButton>
              </span>
            </Tooltip>
          </>
        ) : (
          <>
            <Tooltip title={t('shell.common.edit')}>
              <span>
                <DuncitIconButton
                  size="small"
                  aria-label={t('shell.common.edit')}
                  onClick={() => startEdit(row)}
                  disabled={busy || !!draft}
                >
                  <EditIcon fontSize="small" />
                </DuncitIconButton>
              </span>
            </Tooltip>
            <Tooltip title={t('shell.common.delete')}>
              <span>
                <DuncitIconButton
                  size="small"
                  color="error"
                  aria-label={t('shell.common.delete')}
                  onClick={() => setRemoving(row)}
                  disabled={busy || !!draft}
                >
                  <DeleteIcon fontSize="small" />
                </DuncitIconButton>
              </span>
            </Tooltip>
          </>
        )}
      </TableCell>
    </TableRow>
  );
}
