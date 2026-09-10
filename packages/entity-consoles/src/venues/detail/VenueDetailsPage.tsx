import { useQuery } from '@apollo/client/react';
import { useParams } from 'react-router';
import { Alert, Stack } from '@mui/material';
import { BackHeader, QueryGuard } from '@duncit/ui';
import { DuncitTabs, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import { useTranslation } from '@duncit/shell';
import { VENUE_DETAIL, type AdminVenueDetail } from './queries';
import VenueSummaryCard from './VenueSummaryCard';
import VenueOverviewTab from './VenueOverviewTab';
import VenueOperationsTab from './VenueOperationsTab';
import VenueDocumentsCard from './VenueDocumentsCard';
import VenuePodsTab from './VenuePodsTab';

type VenueTab = 'overview' | 'pods' | 'operations' | 'documents';
type Translate = ReturnType<typeof useTranslation>['t'];

const venueTabs = (t: Translate): DuncitTabItem<VenueTab>[] => [
  { value: 'overview', label: t('admin.venueDetails.tabOverview') },
  { value: 'pods', label: t('admin.venueDetails.tabPods') },
  { value: 'operations', label: t('admin.venueDetails.tabOperations') },
  { value: 'documents', label: t('admin.venueDetails.tabDocuments') },
];

/** Admin → Venues → one venue. The whole record, read-only: approvals and edits
 * stay in the Onboarding portal, and the banner says so rather than leaving an
 * admin hunting for a save button that was never here. */
export default function VenueDetailsPage() {
  const { t } = useTranslation();
  const { venueId = '' } = useParams<{ venueId: string }>();
  const tabs = useTabParam<VenueTab>({ items: venueTabs(t), fallback: 'overview' });
  const { data, loading, error } = useQuery<{ venue: AdminVenueDetail | null }>(VENUE_DETAIL, {
    variables: { venue_doc_id: venueId },
    fetchPolicy: 'cache-and-network',
    skip: !venueId,
  });
  const venue = data?.venue;

  return (
    <QueryGuard
      loading={loading && !venue}
      error={error}
      errorText={error?.message}
      notFound={!venue}
      notFoundText={t('admin.venueDetails.notFound')}
      notFoundSeverity="warning"
      spinnerSx={{ p: 6 }}
    >
      {() =>
        venue && (
          <Stack spacing={2.5}>
            <BackHeader
              backTo="/venues"
              backAriaLabel={t('admin.venueDetails.backAria')}
              backSx={{ bgcolor: 'action.hover' }}
              eyebrow={t('admin.venueDetails.eyebrow')}
              title={venue.venue_name || t('admin.venueDetails.untitled')}
              titleWeight={950}
              titleSx={{ lineHeight: 1.1 }}
            />

            <Alert severity="info" variant="outlined">
              {t('admin.venueDetails.readOnly')}
            </Alert>

            <VenueSummaryCard venue={venue} />

            <DuncitTabs {...tabs} variant="scrollable" allowScrollButtonsMobile />

            {tabs.value === 'overview' && <VenueOverviewTab venue={venue} />}
            {tabs.value === 'pods' && <VenuePodsTab venueId={venue.id} />}
            {tabs.value === 'operations' && <VenueOperationsTab settings={venue.settings} />}
            {tabs.value === 'documents' && <VenueDocumentsCard documents={venue.documents ?? []} />}
          </Stack>
        )
      }
    </QueryGuard>
  );
}
