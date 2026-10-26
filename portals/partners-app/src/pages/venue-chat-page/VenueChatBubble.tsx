import { Avatar, Box, IconButton, Stack, Typography } from '@mui/material';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { LineReactions, SeenFaces } from '@duncit/availability-calendar';
import { venueChatLineActions, type VenueChatLine, type VenueChatReadMark } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import { fmtDate } from '../venue-pods-page/queries';

interface Props {
  line: VenueChatLine;
  /** Sent by the signed-in venue owner — drawn on the right in the primary colour. */
  mine: boolean;
  /** The reader, so their own reactions show as theirs. */
  viewerId: string;
  onReact: (emoji: string) => unknown;
  onEdit: () => void;
  onDelete: () => void;
  /** Whoever has read the thread exactly this far — their faces go under it. */
  seenBy?: VenueChatReadMark[];
}

/**
 * One line of the venue ↔ host thread: who, when (and whether it was edited),
 * the text or photo, its reactions, the faces of whoever has read this far —
 * and, on the owner's own text or photo, Edit and Delete.
 */
export default function VenueChatBubble({ line, mine, viewerId, onReact, onEdit, onDelete, seenBy }: Readonly<Props>) {
  const { t } = useTranslation();
  const author = mine ? t('partners.venueChat.you') : line.user_name || t('partners.venueChat.host');
  const photo = line.type === 'IMAGE' ? line.image_url : null;
  const allowed = venueChatLineActions(line, viewerId);

  return (
    <Stack component="li" spacing={0.5} sx={{ listStyle: 'none', alignItems: mine ? 'flex-end' : 'flex-start' }}>
      <Stack direction={mine ? 'row-reverse' : 'row'} spacing={1} sx={{ alignItems: 'flex-end', maxWidth: '100%' }}>
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
            {line.edited_at ? ` · ${t('availability.offers.chat.edited')}` : ''}
          </Typography>
          {photo && (
            <Box
              component="img"
              src={photo}
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
        {allowed.edit && (
          <IconButton size="small" aria-label={t('availability.offers.chat.edit')} onClick={onEdit} data-testid={`venue-chat-edit-${line.id}`}>
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
        )}
        {allowed.remove && (
          <IconButton size="small" aria-label={t('availability.offers.chat.delete')} onClick={onDelete} data-testid={`venue-chat-delete-${line.id}`}>
            <DeleteOutlineRoundedIcon fontSize="small" />
          </IconButton>
        )}
      </Stack>
      <LineReactions reactions={line.reactions} viewerId={viewerId} onReact={onReact} alignEnd={mine} />
      <SeenFaces marks={seenBy} />
    </Stack>
  );
}
