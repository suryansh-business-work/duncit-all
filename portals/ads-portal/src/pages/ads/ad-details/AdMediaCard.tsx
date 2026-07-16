import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { adTypeLabel } from '../ad-options';
import type { AdRequestDetail } from '../queries';

const PREVIEW_SX = {
  display: 'block',
  width: '100%',
  maxHeight: 320,
  objectFit: 'contain',
  borderRadius: 1,
  bgcolor: 'action.hover',
} as const;

/** The submitted ad creative (image or video) with its media type. */
export default function AdMediaCard({ ad }: Readonly<{ ad: AdRequestDetail }>) {
  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
          <Typography variant="subtitle1" fontWeight={700}>
            Ad Media
          </Typography>
          <Chip size="small" variant="outlined" label={adTypeLabel(ad.ad_type)} />
        </Stack>
        {ad.ad_type === 'VIDEO' ? (
          <Box component="video" src={ad.media_url} controls sx={PREVIEW_SX} />
        ) : (
          <Box component="img" src={ad.media_url} alt={`${ad.ad_title} creative`} sx={PREVIEW_SX} />
        )}
      </CardContent>
    </Card>
  );
}
