import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import EventIcon from '@mui/icons-material/Event';
import PlaceIcon from '@mui/icons-material/Place';
import VideocamIcon from '@mui/icons-material/Videocam';
import { formatMoney } from '@duncit/utils';
import PreviewMedia from './PreviewMedia';
import { PreviewBullets, PreviewCharges, PreviewChips, PreviewSection } from './PodPreviewSections';
import type { PodPreviewModel } from './pod-preview-model';
import { useTranslation } from '../i18n/useTranslation';

/** The two figures the apps put above the fold, side by side. */
function StatBox({ caption, value }: Readonly<{ caption: string; value: string }>) {
  return (
    <Box
      sx={{
        flex: 1,
        p: 1.2,
        borderRadius: '16px',
        bgcolor: (theme) => alpha(theme.palette.text.primary, 0.06),
      }}
    >
      <Typography variant="caption" sx={{
        color: "text.secondary"
      }}>
        {caption}
      </Typography>
      <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1 }}>
        {value}
      </Typography>
    </Box>
  );
}

/**
 * The pod page as a member opens it: hero media, the title block with its chip
 * row, then the same sections the apps stack underneath. A static twin of the
 * mWeb/native detail screen — see PodPreviewCard for why it is rebuilt rather
 * than imported.
 */
export default function PodPreviewDetails({ model }: Readonly<{ model: PodPreviewModel }>) {
  const { t } = useTranslation();
  const money = (amount: number) => formatMoney(amount);
  // Hoisted out of the JSX: each of these is a choice inside a prop, which
  // nests where it sits (S3776) and reads worse than a named value.
  const modeIcon = model.isVirtual ? <VideocamIcon /> : <PlaceIcon />;
  const priceColor = model.isFree ? 'success' : 'primary';
  const spotsValue = model.spotsTotal > 0 ? String(model.spotsTotal) : '—';
  const placeTitle = model.isVirtual ? 'Where you meet' : 'Venue';

  return (
    <Paper variant="outlined" sx={{ borderRadius: '18px', overflow: 'hidden' }}>
      <PreviewMedia media={model.media[0]} title={model.title} height={190} />

      <Stack spacing={2} sx={{ p: 2 }}>
        <Box>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              lineHeight: 1.1
            }}>
            {model.title}
          </Typography>
          {model.hostNames.length > 0 && (
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                mt: 0.5
              }}>
              Hosted by {model.hostNames.join(', ')}
            </Typography>
          )}
          {model.clubName && (
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              {model.clubName}
            </Typography>
          )}
        </Box>

        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Chip label={model.priceText} color={priceColor} sx={{ fontWeight: 700 }} />
          <Chip icon={modeIcon} label={model.modeText} variant="outlined" />
          {model.whenText && <Chip icon={<EventIcon />} label={model.whenText} variant="outlined" />}
        </Stack>

        <Stack direction="row" spacing={1}>
          <StatBox caption={t('podForm.preview.spots')} value={spotsValue} />
          <StatBox caption={t('podForm.preview.price')} value={model.priceText} />
        </Stack>

        {model.placeText && (
          <PreviewSection title={placeTitle}>
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              {model.placeText}
            </Typography>
          </PreviewSection>
        )}

        {model.description && (
          <PreviewSection title={t('podForm.preview.aboutThisPod')}>
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                whiteSpace: 'pre-line'
              }}>
              {model.description}
            </Typography>
          </PreviewSection>
        )}

        {model.info && (
          <PreviewSection title={t('podForm.preview.goodToKnow')}>
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                whiteSpace: 'pre-line'
              }}>
              {model.info}
            </Typography>
          </PreviewSection>
        )}

        {model.offers.length > 0 && (
          <PreviewSection title={t('podForm.preview.whatThisPodOffers')}>
            <PreviewBullets items={model.offers} kind="OFFER" />
          </PreviewSection>
        )}

        {model.perks.length > 0 && (
          <PreviewSection title={t('podForm.common.availablePerks')}>
            <PreviewBullets items={model.perks} kind="PERK" />
          </PreviewSection>
        )}

        {model.charges.length > 0 && (
          <PreviewSection title={t('podForm.preview.chargesAtTheVenue')}>
            <PreviewCharges charges={model.charges} money={money} />
          </PreviewSection>
        )}

        {model.paymentTerms && (
          <PreviewSection title={t('podForm.common.paymentTerms')}>
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                whiteSpace: 'pre-line'
              }}>
              {model.paymentTerms}
            </Typography>
          </PreviewSection>
        )}

        {model.hashtags.length > 0 && <PreviewChips items={model.hashtags} prefix="#" />}
      </Stack>
    </Paper>
  );
}
