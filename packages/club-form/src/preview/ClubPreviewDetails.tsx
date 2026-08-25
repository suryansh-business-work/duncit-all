import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import PlaceIcon from '@mui/icons-material/Place';
import VerifiedIcon from '@mui/icons-material/Verified';
import PreviewMedia from './PreviewMedia';
import {
  PreviewBullets,
  PreviewFaqs,
  PreviewMomentsStrip,
  PreviewSection,
} from './ClubPreviewSections';
import type { ClubPreviewModel } from './club-preview-model';
import { useTranslation } from '../i18n/useTranslation';

/**
 * The club page as a member opens it: hero media, the name block with its
 * category and place chips, then the same content sections the apps stack
 * underneath. A static twin of the mWeb/native club screen — see
 * ClubPreviewCard for why it is rebuilt rather than imported.
 */
export default function ClubPreviewDetails({ model }: Readonly<{ model: ClubPreviewModel }>) {
  const { t } = useTranslation();
  return (
    <Paper variant="outlined" sx={{ borderRadius: '18px', overflow: 'hidden' }}>
      <PreviewMedia media={model.media[0]} title={model.name} height={190} />

      <Stack spacing={2} sx={{ p: 2 }}>
        <Box>
          <Stack direction="row" spacing={0.75} sx={{
            alignItems: "center"
          }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                lineHeight: 1.1
              }}>
              {model.name}
            </Typography>
            {model.isVerified && <VerifiedIcon color="primary" fontSize="small" />}
          </Stack>
          <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
            {model.categoryText && <Chip size="small" label={model.categoryText} />}
            {model.placeText && (
              <Chip size="small" variant="outlined" icon={<PlaceIcon />} label={model.placeText} />
            )}
          </Stack>
        </Box>

        {model.description && (
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              whiteSpace: 'pre-line'
            }}>
            {model.description}
          </Typography>
        )}

        {model.whoWeAre.length > 0 && (
          <PreviewSection title={t('clubForm.preview.whoWeAre')}>
            <PreviewBullets items={model.whoWeAre} />
          </PreviewSection>
        )}

        {model.whatWeDo.length > 0 && (
          <PreviewSection title={t('clubForm.preview.whatWeDo')}>
            <PreviewBullets items={model.whatWeDo} />
          </PreviewSection>
        )}

        {model.perks.length > 0 && (
          <PreviewSection title={t('clubForm.common.perks')}>
            <PreviewBullets items={model.perks} />
          </PreviewSection>
        )}

        {model.values.length > 0 && (
          <PreviewSection title={t('clubForm.preview.ourValues')}>
            <PreviewBullets items={model.values} />
          </PreviewSection>
        )}

        {model.moments.length > 0 && (
          <PreviewSection title={t('clubForm.common.clubMoments')}>
            <PreviewMomentsStrip>
              {model.moments.map((moment) => (
                <Box
                  key={moment.url}
                  sx={{ width: 96, flex: '0 0 auto', borderRadius: '12px', overflow: 'hidden' }}
                >
                  <PreviewMedia media={moment} title={model.name} height={96} />
                </Box>
              ))}
            </PreviewMomentsStrip>
          </PreviewSection>
        )}

        {model.faqs.length > 0 && (
          <PreviewSection title="FAQs">
            <PreviewFaqs faqs={model.faqs} />
          </PreviewSection>
        )}

        {(model.communityLink || model.groupLink) && (
          <PreviewSection title={t('clubForm.preview.community')}>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              {model.communityLink && <Chip size="small" label={t('clubForm.preview.communityLink')} variant="outlined" />}
              {model.groupLink && <Chip size="small" label={t('clubForm.preview.groupLink')} variant="outlined" />}
            </Stack>
          </PreviewSection>
        )}
      </Stack>
    </Paper>
  );
}
