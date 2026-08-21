import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import EventIcon from '@mui/icons-material/Event';
import PlaceIcon from '@mui/icons-material/Place';
import VideocamIcon from '@mui/icons-material/Videocam';
import { formatMoney } from '@duncit/utils';
import PreviewMedia from './PreviewMedia';
import { PreviewBullets, PreviewCharges, PreviewChips, PreviewSection } from './PodPreviewSections';
import type { PodPreviewModel } from './pod-preview-model';

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
      <Typography variant="caption" color="text.secondary">
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
          <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.1 }}>
            {model.title}
          </Typography>
          {model.hostNames.length > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Hosted by {model.hostNames.join(', ')}
            </Typography>
          )}
          {model.clubName && (
            <Typography variant="caption" color="text.secondary">
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
          <StatBox caption="Spots" value={spotsValue} />
          <StatBox caption="Price" value={model.priceText} />
        </Stack>

        {model.placeText && (
          <PreviewSection title={placeTitle}>
            <Typography variant="body2" color="text.secondary">
              {model.placeText}
            </Typography>
          </PreviewSection>
        )}

        {model.description && (
          <PreviewSection title="About this pod">
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
              {model.description}
            </Typography>
          </PreviewSection>
        )}

        {model.info && (
          <PreviewSection title="Good to know">
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
              {model.info}
            </Typography>
          </PreviewSection>
        )}

        {model.offers.length > 0 && (
          <PreviewSection title="What this pod offers">
            <PreviewBullets items={model.offers} kind="OFFER" />
          </PreviewSection>
        )}

        {model.perks.length > 0 && (
          <PreviewSection title="Available perks">
            <PreviewBullets items={model.perks} kind="PERK" />
          </PreviewSection>
        )}

        {model.charges.length > 0 && (
          <PreviewSection title="Charges at the venue">
            <PreviewCharges charges={model.charges} money={money} />
          </PreviewSection>
        )}

        {model.paymentTerms && (
          <PreviewSection title="Payment terms">
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
              {model.paymentTerms}
            </Typography>
          </PreviewSection>
        )}

        {model.hashtags.length > 0 && <PreviewChips items={model.hashtags} prefix="#" />}
      </Stack>
    </Paper>
  );
}
