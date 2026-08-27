import { Stack, Tooltip, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '../i18n/useTranslation';
import type { useMessageSelection } from './useMessageSelection';

interface Props {
  /** The live selection, straight from useMessageSelection. */
  selection: ReturnType<typeof useMessageSelection>;
}

/**
 * What you can do to the messages you have picked.
 *
 * Replaces the header while a selection is live, the way every mail client
 * does: the actions belong to the selection, and leaving the normal header in
 * place would mean two toolbars competing for the same corner.
 */
export default function SelectionBar({ selection }: Readonly<Props>) {
  const { selected, allMine, copy, remove, clear } = selection;
  const { t } = useTranslation();
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        alignItems: "center",
        p: 1,
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'action.selected'
      }}>
      <Tooltip title={t('shell.chat.selection.clear')}>
        <DuncitIconButton size="small" onClick={clear} aria-label={t('shell.chat.selection.clear')}>
          <CloseIcon fontSize="small" />
        </DuncitIconButton>
      </Tooltip>
      <Typography variant="subtitle2" sx={{ flex: 1 }}>
        {t('shell.chat.selection.count', { vars: { count: String(selected.length) } })}
      </Typography>

      <DuncitButton size="small" startIcon={<ContentCopyIcon />} onClick={copy}>
        {t('shell.chat.selection.copy')}
      </DuncitButton>
      <DuncitButton size="small" startIcon={<DeleteIcon />} onClick={() => remove(false)}>
        {t('shell.chat.selection.hide')}
      </DuncitButton>
      {/* Taking a message back reaches the other person's copy, so it is only
          offered when every message picked is one you wrote. */}
      {allMine && (
        <DuncitButton size="small" color="error" onClick={() => remove(true)}>
          {t('shell.chat.selection.deleteForEveryone')}
        </DuncitButton>
      )}
    </Stack>
  );
}
