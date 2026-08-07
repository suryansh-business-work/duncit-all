import { useState } from 'react';
import { Box, IconButton, Link, Paper, Stack, TextField, Tooltip, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import MessageReactions from './MessageReactions';
import type { StaffMessage, StaffReactionKind } from './queries';

interface Props {
  message: StaffMessage;
  mine: boolean;
  /** The reader's own id, so their reaction reads as pressed. */
  meId: string;
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onReact: (id: string, kind: StaffReactionKind) => void;
}

const time = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

const isImage = (message: StaffMessage) => (message.attachment_type ?? '').startsWith('image');

/**
 * One line of the conversation.
 *
 * Edit and delete are yours alone and live on the bubble rather than behind a
 * menu — two clicks to fix a typo is why people send a second message saying
 * "*the*" instead.
 */
export default function MessageBubble({
  message,
  mine,
  meId,
  onEdit,
  onDelete,
  onReact,
}: Readonly<Props>) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.text);

  const deleted = Boolean(message.deleted_at);

  const save = () => {
    const text = draft.trim();
    if (text && text !== message.text) onEdit(message.id, text);
    setEditing(false);
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
      <Paper
        variant="outlined"
        sx={{
          px: 1.25,
          py: 0.75,
          maxWidth: '85%',
          bgcolor: mine && !deleted ? 'primary.main' : 'background.paper',
          color: mine && !deleted ? 'primary.contrastText' : 'text.primary',
          borderColor: mine && !deleted ? 'primary.main' : 'divider',
          // The pick buttons are furniture on a quiet thread, so they wait for
          // the pointer. Keyboard users get them from focus-within, which is
          // the reason this is not a plain :hover.
          '& .staff-reaction-picker': { visibility: 'hidden' },
          '&:hover .staff-reaction-picker, &:focus-within .staff-reaction-picker': {
            visibility: 'visible',
          },
        }}
      >
        {deleted ? (
          <Typography variant="body2" sx={{ fontStyle: 'italic', opacity: 0.7 }}>
            This message was deleted
          </Typography>
        ) : (
          <>
            {message.attachment_url && (
              <Box sx={{ mb: message.text ? 0.5 : 0 }}>
                {isImage(message) ? (
                  <Box
                    component="img"
                    src={message.attachment_url}
                    alt={message.attachment_name || 'attachment'}
                    sx={{ maxWidth: '100%', maxHeight: 220, borderRadius: 1, display: 'block' }}
                  />
                ) : (
                  <Link
                    href={message.attachment_url}
                    target="_blank"
                    rel="noreferrer"
                    color="inherit"
                    sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
                  >
                    <InsertDriveFileIcon fontSize="small" />
                    {message.attachment_name || 'Attachment'}
                  </Link>
                )}
              </Box>
            )}

            {editing ? (
              <Stack spacing={0.5}>
                <TextField
                  size="small"
                  fullWidth
                  multiline
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      save();
                    }
                    if (event.key === 'Escape') setEditing(false);
                  }}
                />
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  Enter saves · Esc cancels
                </Typography>
              </Stack>
            ) : (
              message.text && (
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {message.text}
                </Typography>
              )
            )}
          </>
        )}

        {!deleted && (
          <MessageReactions
            reactions={message.reactions ?? []}
            meId={meId}
            onReact={(kind) => onReact(message.id, kind)}
          />
        )}

        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.25 }}>
          <Typography variant="caption" sx={{ opacity: 0.7, flex: 1 }}>
            {time(message.created_at)}
            {message.edited_at && !deleted ? ' · edited' : ''}
          </Typography>
          {mine && !deleted && !editing && (
            <>
              <Tooltip title="Edit">
                <IconButton
                  size="small"
                  color="inherit"
                  onClick={() => {
                    setDraft(message.text);
                    setEditing(true);
                  }}
                  aria-label="Edit message"
                >
                  <EditIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton
                  size="small"
                  color="inherit"
                  onClick={() => onDelete(message.id)}
                  aria-label="Delete message"
                >
                  <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
