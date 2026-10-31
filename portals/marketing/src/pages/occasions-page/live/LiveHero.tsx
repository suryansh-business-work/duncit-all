import { Link as RouterLink } from 'react-router';
import { Box, Card, Chip, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import FormatQuoteRoundedIcon from '@mui/icons-material/FormatQuoteRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import type { OccasionLive } from '@duncit/gql-types';
import { DuncitButton } from '@duncit/buttons';
import { colorWithAlpha } from '@duncit/utils';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { LIVE_MODE_LABEL, LIVE_SOURCE_COLOR, LIVE_SOURCE_LABEL } from '../copy';
import { pinsColorMode, previewPalette } from '../preview/palette';
import ModeToggle from '../preview/ModeToggle';
import PhonePreview from '../preview/PhonePreview';
import { mwebPreviewUrl, usePreviewMode } from '../preview/usePreviewMode';

/**
 * What every Duncit app wears right now, as big as the page allows: the look
 * running on a phone, why it is on, and when the schedule may next change it.
 */
export default function LiveHero({ live }: Readonly<{ live: OccasionLive }>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { formatDateTime } = useDateFormat();
  const [mode, setMode] = usePreviewMode();
  const look = live.theme ?? null;
  const { palette } = previewPalette(look, mode);
  // The wash behind the hero is the look's own colours; the house look uses the console's.
  const wash = look
    ? `linear-gradient(135deg, ${colorWithAlpha(palette.brand, 0.2)}, ${colorWithAlpha(palette.primary, 0.06)} 60%)`
    : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.12)}, transparent 60%)`;

  return (
    <Card variant="outlined" sx={{ background: wash, overflow: 'hidden' }} data-testid="occasion-live-hero">
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 3, md: 5 }} sx={{ p: { xs: 2.5, md: 4 }, alignItems: 'center' }}>
        <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
          <PhonePreview
            look={look}
            mode={mode}
            size="lg"
            label={t('marketing.occasions.preview.of', { vars: { name: look?.name ?? t('marketing.occasions.live.houseLook') } })}
          />
          <ModeToggle value={mode} onChange={setMode} pinned={pinsColorMode(look)} />
        </Stack>
        <Stack spacing={2} sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="overline" sx={{ color: 'text.secondary' }}>
            {t('marketing.occasions.live.eyebrow')}
          </Typography>
          <Box>
            <Typography variant="h4" component="h2" sx={{ fontWeight: 700 }}>
              {look?.name ?? t('marketing.occasions.live.houseLook')}
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', mt: 0.5 }}>
              {look ? look.description : t('marketing.occasions.live.houseLookHint')}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
            <Chip color={LIVE_SOURCE_COLOR[live.source]} label={t(LIVE_SOURCE_LABEL[live.source])} />
            <Chip variant="outlined" label={t('marketing.occasions.live.modeIs', { vars: { mode: t(LIVE_MODE_LABEL[live.mode]) } })} />
          </Stack>
          {look?.greeting && (
            <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
              <FormatQuoteRoundedIcon sx={{ color: 'text.secondary' }} aria-hidden />
              <Typography variant="body1" sx={{ fontStyle: 'italic' }}>
                {look.greeting}
              </Typography>
            </Stack>
          )}
          {live.next_change_at && (
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: 'text.secondary' }}>
              <AccessTimeRoundedIcon fontSize="small" aria-hidden />
              <Typography variant="body2">
                {t('marketing.occasions.live.nextChange', { vars: { when: formatDateTime(live.next_change_at) } })}
              </Typography>
            </Stack>
          )}
          {look && (
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
              <DuncitButton
                variant="contained"
                href={mwebPreviewUrl(look.key)}
                target="_blank"
                rel="noopener noreferrer"
                endIcon={<OpenInNewRoundedIcon />}
              >
                {t('marketing.occasions.openOnMweb')}
              </DuncitButton>
              <DuncitButton component={RouterLink} to={`/occasions/themes/${encodeURIComponent(look.key)}`} startIcon={<EditRoundedIcon />}>
                {t('marketing.occasions.editLook')}
              </DuncitButton>
            </Stack>
          )}
        </Stack>
      </Stack>
    </Card>
  );
}
