import { Alert, Box, Paper, Skeleton, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import type { ShortLinkDestinationMeta } from '../queries';

interface Props {
  /** The card as it will unfurl — override already applied. */
  card: ShortLinkDestinationMeta | null;
  ready: boolean;
  loading: boolean;
  error: string | null;
}

function PreviewState({ card, ready, loading, error }: Readonly<Props>) {
  const { t } = useTranslation();
  if (!ready) {
    return <Typography variant="body2" sx={{ color: 'text.secondary' }}>{t('marketing.shortLinks.previewNeedsDestination')}</Typography>;
  }
  if (loading) return <Skeleton variant="rectangular" height={88} sx={{ borderRadius: 1 }} />;
  if (error) return <Alert severity="warning">{error}</Alert>;
  if (!card?.title) {
    return <Alert severity="info">{t('marketing.shortLinks.previewNothingPublished')}</Alert>;
  }
  return (
    <Paper variant="outlined" sx={{ display: 'flex', gap: 1.5, p: 1.5, alignItems: 'flex-start' }}>
      {card.image_url && (
        <Box
          component="img"
          src={card.image_url}
          alt=""
          sx={{ width: 88, height: 88, objectFit: 'cover', borderRadius: 1, flexShrink: 0 }}
        />
      )}
      <Stack spacing={0.25} sx={{ minWidth: 0 }}>
        {card.site_name && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {card.site_name}
          </Typography>
        )}
        <Typography variant="subtitle2" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
          {card.title}
        </Typography>
        {card.description && (
          <Typography variant="body2" sx={{ color: 'text.secondary', overflowWrap: 'anywhere' }}>
            {card.description}
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}

/** What WhatsApp, Slack or X will show for the link, kept current as the form changes. */
export default function LinkPreviewCard(props: Readonly<Props>) {
  return (
    <Box aria-live="polite" aria-busy={props.loading} data-testid="short-link-preview-card">
      <PreviewState {...props} />
    </Box>
  );
}
