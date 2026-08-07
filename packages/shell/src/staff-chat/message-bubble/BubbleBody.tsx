import { Stack, TextField, Typography } from '@mui/material';
import MessageAttachment from '../MessageAttachment';
import MessageText from '../MessageText';
import type { StaffMessage } from '../queries';

interface Props {
  message: StaffMessage;
  deleted: boolean;
  editing: boolean;
  draft: string;
  fontSize: number;
  onDraft: (text: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onNavigate?: (path: string) => void;
}

/**
 * The message itself: what came with it, and what it says.
 *
 * A deleted one keeps its place and loses its words — a line that vanishes from
 * the middle of a conversation reads as a bug rather than as a deletion.
 */
export default function BubbleBody({
  message,
  deleted,
  editing,
  draft,
  fontSize,
  onDraft,
  onSave,
  onCancel,
  onNavigate,
}: Readonly<Props>) {
  if (deleted) {
    return (
      <Typography variant="body2" sx={{ fontStyle: 'italic', opacity: 0.7 }}>
        This message was deleted
      </Typography>
    );
  }

  if (editing) {
    return (
      <Stack spacing={0.5}>
        <TextField
          size="small"
          fullWidth
          multiline
          autoFocus
          value={draft}
          onChange={(event) => onDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              onSave();
            }
            if (event.key === 'Escape') onCancel();
          }}
          inputProps={{ 'aria-label': 'Edit message' }}
        />
        <Typography variant="caption" sx={{ opacity: 0.8 }}>
          Enter saves · Esc cancels
        </Typography>
      </Stack>
    );
  }

  return (
    <>
      <MessageAttachment message={message} />
      {message.text && (
        <MessageText text={message.text} fontSize={fontSize} onNavigate={onNavigate} />
      )}
    </>
  );
}
