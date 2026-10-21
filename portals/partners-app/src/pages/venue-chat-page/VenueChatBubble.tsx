import { Avatar, Box, Stack, Typography } from '@mui/material';
import type { VenueChatLine } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import { fmtDate } from '../venue-pods-page/queries';

interface Props {
  line: VenueChatLine;
  /** Sent by the signed-in venue owner — drawn on the right in the primary colour. */
  mine: boolean;
}

/** One line of the venue ↔ host thread: who, when, and the text or photo. */
export default function VenueChatBubble({ line, mine }: Readonly<Props>) {
  const { t } = useTranslation();
  const author = mine ? t('partners.venueChat.you') : line.user_name || t('partners.venueChat.host');
  const isPhoto = line.type === 'IMAGE' && Boolean(line.image_url);

  return (
    <Stack
      component="li"
      direction={mine ? 'row-reverse' : 'row'}
      spacing={1}
      sx={{ alignItems: 'flex-end', listStyle: 'none' }}
    >
      {!mine && (
        <Avatar src={line.user_photo ?? undefined} alt="" sx={{ width: 28, height: 28 }}>
          {author.charAt(0).toUpperCase()}
        </Avatar>
      )}
      <Box
        sx={{
          maxWidth: '75%',
          px: 1.5,
          py: 1,
          borderRadius: 1,
          bgcolor: mine ? 'primary.main' : 'action.hover',
          color: mine ? 'primary.contrastText' : 'text.primary',
        }}
      >
        <Typography variant="caption" component="p" sx={{ fontWeight: 700, opacity: 0.85 }}>
          {author} · <time dateTime={line.createdAt}>{fmtDate(line.createdAt)}</time>
        </Typography>
        {isPhoto && (
          <Box
            component="img"
            src={line.image_url ?? undefined}
            alt={t('partners.venueChat.photoAlt', { vars: { name: author } })}
            sx={{ display: 'block', maxWidth: '100%', maxHeight: 240, mt: 0.5, borderRadius: 1 }}
          />
        )}
        {line.text && (
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            {line.text}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}
