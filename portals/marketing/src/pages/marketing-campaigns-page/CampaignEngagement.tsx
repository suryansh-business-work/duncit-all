import { Alert, Box, Chip, Stack, Typography } from '@mui/material';
import { EM_DASH } from '@duncit/table';
import DetailField from './DetailField';
import TrackedAssetList from './TrackedAssetList';
import type { MarketingCampaignDetail } from './queries';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  campaign: MarketingCampaignDetail;
  formatDateTime: (value: Date | string) => string;
}

const GRID = {
  display: 'grid',
  gap: 2,
  gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' },
} as const;

/** Opens are pixel loads; an image load or a click proves an open too, which
 * is what keeps the first-open stamp honest when the pixel is blocked. */
const openHint = (campaign: MarketingCampaignDetail) => {
  if (campaign.open_count > 1) return `${campaign.open_count} opens — read more than once`;
  return 'Pixel loads';
};

export default function CampaignEngagement({ campaign, formatDateTime }: Readonly<Props>) {
  const { t } = useTranslation();
  const when = (value?: string | null) => (value ? formatDateTime(value) : EM_DASH);
  const delivery = campaign.delivery;

  return (
    <Stack spacing={2}>
      <Box>
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 700,
            mb: 1
          }}>
          Engagement
        </Typography>
        <Box sx={GRID}>
          <DetailField
            label={t('marketing.marketingCampaigns.opened')}
            value={String(campaign.open_count)}
            hint={openHint(campaign)}
          />
          <DetailField
            label={t('marketing.marketingCampaigns.imagesLoaded')}
            value={String(campaign.image_load_count)}
            hint="Counts an open the pixel missed"
          />
          <DetailField label={t('marketing.common.clicked')} value={String(campaign.click_count)} />
          <DetailField label={t('marketing.marketingCampaigns.firstOpened')} value={when(campaign.first_opened_at)} />
          <DetailField label={t('marketing.marketingCampaigns.lastOpened')} value={when(campaign.last_opened_at)} />
          {delivery && (
            <DetailField
              label={t('marketing.marketingCampaigns.acceptedBySmtp')}
              value={String(delivery.accepted)}
              hint={delivery.rejected > 0 ? `${delivery.rejected} refused` : undefined}
            />
          )}
        </Box>
      </Box>

      {delivery && delivery.rejected_addresses.length > 0 && (
        <Alert severity="warning" data-testid="rejected-addresses">
          {`The mail server refused these addresses outright: ${delivery.rejected_addresses.join(', ')}`}
        </Alert>
      )}

      <TrackedAssetList
        title={t('marketing.marketingCampaigns.links')}
        emptyText={t('marketing.marketingCampaigns.thisCampaignHadNoLinksTo')}
        rows={campaign.tracked_links.map((link) => ({
          url: link.url,
          count: link.click_count,
          badge: <Chip size="small" label={link.kind} variant="outlined" />,
        }))}
        countLabel="clicks"
      />

      <TrackedAssetList
        title={t('marketing.marketingCampaigns.images')}
        emptyText={t('marketing.marketingCampaigns.thisCampaignHadNoImagesTo')}
        rows={campaign.tracked_images.map((image) => ({
          url: image.url,
          count: image.load_count,
        }))}
        countLabel="loads"
      />
    </Stack>
  );
}
