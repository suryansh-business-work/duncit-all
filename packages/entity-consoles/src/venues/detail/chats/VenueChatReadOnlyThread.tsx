import { useQuery } from '@apollo/client/react';
import { Alert, Avatar, Box, CircularProgress, Stack, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { LineReactions, OfferChatCard, isOfferChatLine } from '@duncit/availability-calendar';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { newestOfferLineId, VENUE_CHAT_PAGE, type VenueChatLine } from '@duncit/utils';
import { ADMIN_VENUE_CHAT_MESSAGES } from './queries';

/** A line's content: an offer move as its card (a record — staff answer nothing, react to nothing), a photo, or the text. */
function LineBody({ line, newest, photoAlt }: Readonly<{ line: VenueChatLine; newest: boolean; photoAlt: string }>) {
  if (isOfferChatLine(line)) return <OfferChatCard move={line.offer} viewer="STAFF" newest={newest} line={line} />;
  if (line.type === 'IMAGE' && line.image_url) {
    return <Box component="img" src={line.image_url} alt={photoAlt} sx={{ maxWidth: 240, borderRadius: 1 }} />;
  }
  return (
    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {line.text}
    </Typography>
  );
}

/** One venue chat as Duncit staff read it: every line, oldest first — offer moves as their cards — no composer, no answers. */
export default function VenueChatReadOnlyThread({
  podId,
  title,
  onBack,
}: Readonly<{ podId: string; title: string; onBack: () => void }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const { data, loading, error } = useQuery(ADMIN_VENUE_CHAT_MESSAGES, {
    variables: { pod_id: podId, limit: VENUE_CHAT_PAGE },
    fetchPolicy: 'cache-and-network',
  });
  const lines = data?.adminVenueChatMessages ?? [];
  const newestId = newestOfferLineId(lines);

  const renderLines = () => {
    if (loading && !data) {
      return (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}>
          <CircularProgress size={24} aria-label={t('shell.a11y.loading')} />
        </Box>
      );
    }
    if (error && !data) return <Alert severity="error">{t('admin.venueDetails.chatsLoadFailed')}</Alert>;
    if (lines.length === 0) {
      return (
        <Typography variant="body2" sx={{ color: 'text.secondary', py: 2 }}>
          {t('admin.venueDetails.chatEmpty')}
        </Typography>
      );
    }
    return (
      <Stack spacing={1.5} component="ol" sx={{ listStyle: 'none', p: 0, m: 0 }}>
        {lines.map((line) => (
          <Stack key={line.id} component="li" direction="row" spacing={1.25}>
            <Avatar src={line.user_photo ?? undefined} alt={line.user_name ?? ''} sx={{ width: 32, height: 32 }} />
            <Stack spacing={0.25} sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {line.user_name} · {formatDateTime(line.createdAt)}
                {line.edited_at ? ` · ${t('availability.offers.chat.edited')}` : ''}
              </Typography>
              <LineBody line={line} newest={line.id === newestId} photoAlt={t('admin.venueDetails.chatPhoto')} />
              {!isOfferChatLine(line) && <LineReactions reactions={line.reactions} viewerId={null} />}
            </Stack>
          </Stack>
        ))}
      </Stack>
    );
  };

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <DuncitButton startIcon={<ArrowBackRoundedIcon />} onClick={onBack}>
          {t('admin.venueDetails.chatBack')}
        </DuncitButton>
        <Typography variant="subtitle1" sx={{ fontWeight: 800 }} noWrap>
          {title}
        </Typography>
      </Stack>
      {renderLines()}
    </Stack>
  );
}
