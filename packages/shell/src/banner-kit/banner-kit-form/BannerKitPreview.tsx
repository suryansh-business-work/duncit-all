import { useWatch } from 'react-hook-form';
import { Avatar, Box, Paper, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { isBrandColorEntry, normalizeInstagramHandle } from '@duncit/forms/schemas';
import { useTranslation } from '../../i18n/useTranslation';
import type { BannerKitPreviewProps } from './banner-kit.types';

/**
 * A rough, static look at the kit's slide in the carousel — "The venue" or
 * "Meet your host" — drawn in MUI as the partner types. It is not the banner
 * engine's render: that is made when banners are made.
 */
export function BannerKitPreview({ entity, name, control }: Readonly<BannerKitPreviewProps>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [logoUrl, instagram, photos, tagline, brandColor] = useWatch({
    control,
    name: ['logo_url', 'instagram_handle', 'photos', 'tagline', 'brand_color'],
  });
  // The partner's own colour is data, not a design value; the theme's primary stands in until they pick one.
  // A half-typed colour is not drawn: MUI cannot read it, and the form is still saying so.
  const background = brandColor && isBrandColorEntry(brandColor) ? brandColor : theme.palette.primary.main;
  const color = theme.palette.getContrastText(background);
  const photo = photos[0]?.url;
  const handle = normalizeInstagramHandle(instagram);
  const heading = entity === 'VENUE' ? t('shell.bannerKit.previewVenue') : t('shell.bannerKit.previewHost');

  return (
    <Stack spacing={1} data-testid="banner-kit-preview">
      <Typography variant="subtitle2" component="h3">
        {t('shell.bannerKit.preview')}
      </Typography>
      <Paper
        variant="outlined"
        aria-hidden
        sx={{ bgcolor: background, color, aspectRatio: '4 / 5', p: 2, borderRadius: 2, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 1.5 }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Avatar src={logoUrl || undefined} variant={entity === 'VENUE' ? 'rounded' : 'circular'}>
            {name.charAt(0)}
          </Avatar>
          <Stack sx={{ minWidth: 0 }}>
            <Typography variant="overline" sx={{ lineHeight: 1.2 }}>
              {heading}
            </Typography>
            <Typography variant="subtitle1" noWrap sx={{ fontWeight: 800 }}>
              {name}
            </Typography>
          </Stack>
        </Stack>
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            borderRadius: 1.5,
            bgcolor: 'action.hover',
            backgroundImage: photo ? `url("${photo}")` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        {tagline && (
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {tagline}
          </Typography>
        )}
        {handle && <Typography variant="caption">@{handle}</Typography>}
      </Paper>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {t('shell.bannerKit.previewHint')}
      </Typography>
    </Stack>
  );
}
