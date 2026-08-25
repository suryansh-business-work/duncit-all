import { useQuery } from '@apollo/client';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { useTranslation } from '../i18n/useTranslation';
import { STAFF_MESSAGE_EDITS, type StaffMessageEdit } from './queries';
import type { ChatFormats } from './useChatSettings';

interface Props {
  open: boolean;
  messageId: string;
  /** What it says now — the last entry in the history. */
  current: string;
  formats: ChatFormats;
  onClose: () => void;
}

/**
 * Every earlier wording of one message.
 *
 * An edit can change what a conversation appears to have agreed, which is why
 * the previous text is kept at all. It is read on demand rather than shipped
 * with every message: handing both parties a running record of each other's
 * second thoughts is a different thing from keeping one.
 */
export default function EditHistoryDialog({
  open,
  messageId,
  current,
  formats,
  onClose,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<{ staffMessageEdits: StaffMessageEdit[] }>(
    STAFF_MESSAGE_EDITS,
    { variables: { id: messageId }, skip: !open, fetchPolicy: 'network-only' }
  );

  const edits = data?.staffMessageEdits ?? [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('shell.chat.history.title')}</DialogTitle>
      <DialogContent>
        {loading && <CircularProgress size={20} sx={{ display: 'block', mx: 'auto', my: 2 }} />}
        {error && <Alert severity="error">{error.message}</Alert>}

        <Stack spacing={1.5} divider={<Divider flexItem />}>
          {edits.map((edit) => (
            <Stack key={`${edit.at}-${edit.text}`} spacing={0.25}>
              <Typography variant="caption" sx={{
                color: "text.secondary"
              }}>
                {edit.at ? formats.full.format(new Date(edit.at)) : t('shell.chat.history.earlier')}
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {edit.text}
              </Typography>
            </Stack>
          ))}

          {/* The version they are looking at, last and labelled — a list of
              only the old ones makes you guess which is which. */}
          <Stack spacing={0.25}>
            <Typography variant="caption" color="primary" sx={{ fontWeight: 700 }}>
              {t('shell.chat.history.current')}
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {current}
            </Typography>
          </Stack>
        </Stack>

        {!loading && !error && edits.length === 0 && (
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              mt: 1,
              display: 'block'
            }}>
            {t('shell.chat.history.none')}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('shell.chat.history.close')}</Button>
      </DialogActions>
    </Dialog>
  );
}
