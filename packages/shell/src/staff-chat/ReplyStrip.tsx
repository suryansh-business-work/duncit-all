import { Box, IconButton, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { StaffMessage } from './queries';

interface Props {
  replyTo: StaffMessage;
  nameOf: (userId: string) => string;
  onCancel: () => void;
}

/**
 * What you are answering, until it is sent.
 *
 * A reply with no visible target is a message that reads as a non sequitur to
 * its own author.
 */
export default function ReplyStrip({ replyTo, nameOf, onCancel }: Readonly<Props>) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{ px: 1.5, py: 0.75, borderTop: 1, borderColor: 'divider', bgcolor: 'action.hover' }}
    >
      <Box sx={{ width: 3, alignSelf: 'stretch', bgcolor: 'primary.main', borderRadius: 1 }} />
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
          Replying to {nameOf(replyTo.from_user_id)}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
          {replyTo.text || replyTo.attachment_name || 'Attachment'}
        </Typography>
      </Box>
      <IconButton size="small" onClick={onCancel} aria-label="Cancel reply">
        <CloseIcon fontSize="small" />
      </IconButton>
    </Stack>
  );
}
