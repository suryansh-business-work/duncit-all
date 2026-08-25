import { Box, Chip, Stack, Typography } from '@mui/material';
import { useTranslation } from '../../i18n/useTranslation';
import PushPinIcon from '@mui/icons-material/PushPin';
import ForwardIcon from '@mui/icons-material/Forward';
import type { StaffMessage } from '../queries';

interface Props {
  message: StaffMessage;
  own: boolean;
  nameOf: (userId: string) => string;
  repliedTo?: StaffMessage | null;
}

/**
 * The three things said ABOUT a message before its words: that it is pinned,
 * that it came from somewhere else, and what it is answering.
 *
 * Together because they stack in that order and always above the body — and
 * apart from the bubble because a bubble that renders all of this inline is a
 * function nobody can read at a glance.
 */
export default function BubbleBadges({ message, own, nameOf, repliedTo }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <>
      {message.pinned_at && (
        <Chip size="small" icon={<PushPinIcon />} label={t('shell.chat.thread.pinned')} sx={{ height: 20, fontSize: 11, mb: 0.5 }} />
      )}

      {message.forwarded_from && (
        <Stack
          direction="row"
          spacing={0.5}
          sx={{
            alignItems: "center",
            opacity: 0.75,
            mb: 0.25
          }}>
          <ForwardIcon sx={{ fontSize: 13 }} />
          <Typography variant="caption">Forwarded from {nameOf(message.forwarded_from)}</Typography>
        </Stack>
      )}

      {/* The quoted line, so a reply reads as an answer and not a non sequitur. */}
      {repliedTo && (
        <Box
          sx={{
            mb: 0.5,
            pl: 1,
            borderLeft: 3,
            borderColor: own ? 'rgba(255,255,255,0.6)' : 'primary.main',
            opacity: 0.85,
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
            {nameOf(repliedTo.from_user_id)}
          </Typography>
          <Typography variant="caption" noWrap sx={{ display: 'block', maxWidth: 260 }}>
            {repliedTo.text || repliedTo.attachment_name || 'Attachment'}
          </Typography>
        </Box>
      )}
    </>
  );
}
