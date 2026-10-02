import { Switch, TableCell, TableRow, TextField, Tooltip } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { EditRow } from './types';

interface Props {
  draft: EditRow;
  setDraft: (draft: EditRow) => void;
  saveDraft: () => void;
  cancelDraft: () => void;
  busy: boolean;
}

/** Inline editor row for a brand-new service. */
export function ServiceDraftRow({ draft, setDraft, saveDraft, cancelDraft, busy }: Readonly<Props>) {
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
        />
      </TableCell>
      <TableCell>
        <TextField
          size="small"
          fullWidth
          // eslint-disable-next-line jsx-a11y/no-autofocus -- focus moves into the inline editor the user just opened (WCAG 2.4.3)
          autoFocus
          placeholder={t('crm.page.eGCoachingTraining')}
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          slotProps={{ htmlInput: { 'aria-label': t('crm.page.serviceName') } }}
        />
      </TableCell>
      <TableCell>
        <Switch
          checked={draft.is_active}
          onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
          slotProps={{ input: { 'aria-label': t('crm.common.active') } }}
        />
      </TableCell>
      <TableCell align="right">
        <Tooltip title={t('shell.common.save')}>
          <span>
            <DuncitIconButton
              aria-label={t('shell.common.save')}
              size="small"
              color="primary"
              onClick={saveDraft}
              disabled={busy}
            >
              <SaveIcon fontSize="small" />
            </DuncitIconButton>
          </span>
        </Tooltip>
        <Tooltip title={t('shell.common.cancel')}>
          <span>
            <DuncitIconButton
              aria-label={t('shell.common.cancel')}
              size="small"
              onClick={cancelDraft}
              disabled={busy}
            >
              <CloseIcon fontSize="small" />
            </DuncitIconButton>
          </span>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
}
