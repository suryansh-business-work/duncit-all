import { useEffect, useRef, useState } from 'react';
import { Box, IconButton, InputBase, Paper, Stack, Tooltip, Typography } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import type { IntelMessageAttachment } from '@duncit/gql-types';
import { useTranslation } from '@duncit/app-settings';
import MessageAttachments from './MessageAttachments';

interface Props {
  content: string;
  edited: boolean;
  attachments?: readonly IntelMessageAttachment[];
  /** Undefined while a turn runs: editing then would race the answer. */
  onEdit?: (text: string) => void;
}

/** The person's question, right-aligned; editable in place, which answers again from there. */
export default function UserMessage({ content, edited, attachments = [], onEdit }: Readonly<Props>) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  // Opening the editor moves focus into it (keyboard users land where they can type).
  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);
  const save = () => {
    const text = draft.trim();
    if (text && text !== content) onEdit?.(text);
    setEditing(false);
  };

  return (
    <Stack sx={{ alignItems: 'flex-end', '&:hover .intel-msg-actions': { opacity: 1 } }}>
      <Paper sx={{ px: 2, py: 1.25, maxWidth: { xs: '92%', md: '75%' }, bgcolor: 'primary.main', color: 'primary.contrastText', borderRadius: 3, borderTopRightRadius: 6 }}>
        {editing ? (
          <InputBase
            multiline
            inputRef={inputRef}
            fullWidth
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                save();
              }
              if (e.key === 'Escape') setEditing(false);
            }}
            inputProps={{ 'aria-label': t('intel.chat.editMessage') }}
            sx={{ color: 'inherit', minWidth: 240 }}
          />
        ) : (
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {content}
          </Typography>
        )}
      </Paper>
      <MessageAttachments attachments={attachments} />
      <Box className="intel-msg-actions" sx={{ opacity: { xs: 1, md: 0 }, transition: 'opacity .2s', display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
        {edited && !editing && (
          <Typography variant="caption" color="text.secondary">
            {t('intel.chat.edited')}
          </Typography>
        )}
        {editing ? (
          <>
            <Tooltip title={t('intel.chat.saveEdit')}>
              <IconButton size="small" aria-label={t('intel.chat.saveEdit')} onClick={save}>
                <CheckIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('intel.chat.cancelEdit')}>
              <IconButton size="small" aria-label={t('intel.chat.cancelEdit')} onClick={() => setEditing(false)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        ) : (
          onEdit && (
            <Tooltip title={t('intel.chat.editMessage')}>
              <IconButton
                size="small"
                aria-label={t('intel.chat.editMessage')}
                onClick={() => {
                  setDraft(content);
                  setEditing(true);
                }}
              >
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )
        )}
      </Box>
    </Stack>
  );
}
