import { Paper, Stack, Typography } from '@mui/material';

interface Props {
  reopenable: boolean;
  reopenDeadline: string | null;
  formatDateTime: (iso: string) => string;
}

/** Banner shown when the chat is resolved/closed — locks the conversation (B7). */
export default function ClosedNotice({ reopenable, reopenDeadline, formatDateTime }: Readonly<Props>) {
  let windowText: string;
  if (reopenable && reopenDeadline) {
    windowText = `You can reopen it until ${formatDateTime(reopenDeadline)}.`;
  } else {
    windowText = 'The reopen window has passed — start a new chat if you still need help.';
  }

  return (
    <Paper data-testid="support-chat-closed-notice" sx={{ p: 1.5, borderRadius: '18px', textAlign: 'center', bgcolor: 'action.hover' }}>
      <Stack spacing={0.25}>
        <Typography data-testid="chat-closed-note" variant="caption" sx={{ fontWeight: 600 }}>
          This conversation has been marked as resolved.
        </Typography>
        <Typography data-testid="chat-reopen-deadline" variant="caption" sx={{
          color: "text.secondary"
        }}>
          {windowText}
        </Typography>
      </Stack>
    </Paper>
  );
}
