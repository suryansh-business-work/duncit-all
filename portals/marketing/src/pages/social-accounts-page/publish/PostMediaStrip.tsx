import { Box, Chip, Stack } from '@mui/material';
import CollectionsOutlinedIcon from '@mui/icons-material/CollectionsOutlined';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import { useTranslation } from '@duncit/app-settings';
import type { SocialPostMedia } from '../publish.queries';

const SIDE = 72;

/** One media item as a square: the picture itself, or a camera standing in for a video. */
export function MediaThumb({ item }: Readonly<{ item: SocialPostMedia }>) {
  if (item.type === 'VIDEO') {
    return (
      <Box
        sx={{ width: SIDE, height: SIDE, borderRadius: 1, bgcolor: 'action.hover', display: 'grid', placeItems: 'center', flexShrink: 0 }}
        data-testid="social-media-video"
      >
        <VideocamOutlinedIcon sx={{ color: 'text.secondary' }} aria-hidden />
      </Box>
    );
  }
  return <Box component="img" src={item.url} alt="" sx={{ width: SIDE, height: SIDE, objectFit: 'cover', borderRadius: 1, flexShrink: 0 }} />;
}

/** "3 media": the small mark a carousel carries wherever only its cover is shown. */
export function MediaCountChip({ count }: Readonly<{ count: number }>) {
  const { t } = useTranslation();
  return (
    <Chip
      size="small"
      variant="outlined"
      icon={<CollectionsOutlinedIcon />}
      label={t('marketing.social.mediaCount', { count })}
      data-testid="social-media-count"
    />
  );
}

/** Every item of a post in its order — where there is room for the whole carousel, not only its cover. */
export default function PostMediaStrip({ media }: Readonly<{ media: SocialPostMedia[] }>) {
  const { t } = useTranslation();
  return (
    <Stack
      component="ol"
      direction="row"
      spacing={1}
      useFlexGap
      aria-label={t('marketing.social.mediaStripLabel')}
      sx={{ flexWrap: 'wrap', listStyle: 'none', m: 0, p: 0 }}
      data-testid="social-media-strip"
    >
      {media.map((item, index) => (
        <Box component="li" key={`${index}-${item.url}`} sx={{ display: 'flex' }}>
          <MediaThumb item={item} />
        </Box>
      ))}
    </Stack>
  );
}
