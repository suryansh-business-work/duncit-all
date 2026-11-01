import { useQuery } from '@apollo/client/react';
import { useNavigate, useParams } from 'react-router';
import { Box, Stack } from '@mui/material';
import { BackHeader, QueryGuard } from '@duncit/ui';
import { DuncitTabs, tabPanelProps, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import { VENUE_DETAILS, type AdminVenueDetails } from './queries';
import VenueOverviewCard from './VenueOverviewCard';
import VenuePodsTab from './VenuePodsTab';
import { useTranslation } from '@duncit/app-settings';
import { BannerKitPanel, PodBannersPanel } from '@duncit/shell';

// Slot Availability + Account Health are not applicable to onboarded venue
// details and are intentionally not shown here.
type VenueTab = 'overview' | 'pods' | 'bannerKit' | 'banners';
type Translate = ReturnType<typeof useTranslation>['t'];

const venueTabs = (t: Translate): DuncitTabItem<VenueTab>[] => [
  { value: 'overview', label: t('onboarding.venueDetails.overview'), testId: 'venue-details-tab-overview' },
  { value: 'pods', label: t('shell.nav.pods'), testId: 'venue-details-tab-pods' },
  // What the venue's pod banners are made from, and making them for its next pods.
  { value: 'bannerKit', label: t('shell.bannerKit.title'), testId: 'venue-details-tab-bannerKit' },
  { value: 'banners', label: t('shell.podBanners.title'), testId: 'venue-details-tab-banners' },
];

export default function VenueDetailsPage() {
  const { t } = useTranslation();
  const { venueId = '' } = useParams<{ venueId: string }>();
  const navigate = useNavigate();
  // Also the deep link: /venues/:id?selectedtab=pods opens the Pods tab from
  // the Onboarded Venues table's pod-count button.
  const tabs = useTabParam<VenueTab>({ items: venueTabs(t), fallback: 'overview' });
  const tab = tabs.value;
  const { data, loading, error } = useQuery<{ venue: AdminVenueDetails | null }>(VENUE_DETAILS, {
    variables: { venue_doc_id: venueId },
    fetchPolicy: 'cache-and-network',
    skip: !venueId,
  });

  return (
    <QueryGuard
      loading={loading && !data}
      error={error}
      errorText={error?.message}
      notFound={!data?.venue}
      notFoundText="Venue not found."
      notFoundSeverity="warning"
      spinnerSx={{ p: 6 }}
    >
      {() => {
        const venue = data!.venue!;
        return (
          <Stack spacing={2.5}>
            <BackHeader
              onBack={() => navigate('/venues')}
              backAriaLabel="Back to venues"
              backSx={{ bgcolor: 'action.hover' }}
              eyebrow="Venue"
              title={venue.venue_name || 'Untitled venue'}
              titleWeight={950}
              titleSx={{ lineHeight: 1.1 }}
            />

            <DuncitTabs {...tabs} idPrefix="venue-details" variant="scrollable" allowScrollButtonsMobile />

            <Box {...tabPanelProps('venue-details', tab)}>
              {tab === 'overview' && <VenueOverviewCard venue={venue} />}

              {tab === 'pods' && <VenuePodsTab venueId={venue.id} />}

              {tab === 'bannerKit' && <BannerKitPanel entity="VENUE" mode="console" id={venue.id} />}

              {tab === 'banners' && <PodBannersPanel filter={{ field: 'venue_id', value: venue.id }} />}
            </Box>
          </Stack>
        );
      }}
    </QueryGuard>
  );
}
