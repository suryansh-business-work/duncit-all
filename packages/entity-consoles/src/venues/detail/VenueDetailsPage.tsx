import { useQuery } from '@apollo/client/react';
import { Link as RouterLink, useParams } from 'react-router';
import { Stack } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { DuncitButton } from '@duncit/buttons';
import { BackHeader, QueryGuard } from '@duncit/ui';
import { DuncitTabs, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import { useTranslation } from '@duncit/shell';
import ChangeLogsSection from '../../shared/change-logs';
import { VENUE_DETAIL, type AdminVenueDetail } from './queries';
import VenueSummaryCard from './VenueSummaryCard';
import VenueOverviewTab from './VenueOverviewTab';
import VenueOperationsTab from './VenueOperationsTab';
import VenueDocumentsCard from './VenueDocumentsCard';
import VenuePodsTab from './VenuePodsTab';

type VenueTab = 'overview' | 'pods' | 'operations' | 'documents' | 'changeLogs';
type Translate = ReturnType<typeof useTranslation>['t'];

const venueTabs = (t: Translate): DuncitTabItem<VenueTab>[] => [
  { value: 'overview', label: t('admin.venueDetails.tabOverview') },
  { value: 'pods', label: t('admin.venueDetails.tabPods') },
  { value: 'operations', label: t('admin.venueDetails.tabOperations') },
  { value: 'documents', label: t('admin.venueDetails.tabDocuments') },
  { value: 'changeLogs', label: t('directory.changeLogs.tab') },
];

/**
 * Venues → one venue. The whole record, with the way into editing it.
 *
 * It used to say it was read-only and point at the Onboarding portal, which
 * meant every correction to a live venue — a phone number, an operating hour, a
 * commission — was somebody else's screen. Now the record is edited where it is
 * read, and the Change Logs tab is what makes that safe: every field that moves
 * is recorded with who moved it and from where.
 */
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
              actions={
                <DuncitButton
                  component={RouterLink}
                  to={`/venues/${venue.id}/edit`}
                  variant="contained"
                  startIcon={<EditIcon />}
                >
                  {t('directory.venueEditor.editVenue')}
                </DuncitButton>
              }
            />

            <VenueSummaryCard venue={venue} />

            <DuncitTabs {...tabs} variant="scrollable" allowScrollButtonsMobile />

            {tabs.value === 'overview' && <VenueOverviewTab venue={venue} />}
            {tabs.value === 'pods' && <VenuePodsTab venueId={venue.id} />}
            {tabs.value === 'operations' && <VenueOperationsTab settings={venue.settings} />}
            {tabs.value === 'documents' && <VenueDocumentsCard documents={venue.documents ?? []} />}
            {tabs.value === 'changeLogs' && (
              <ChangeLogsSection
                entityType="VENUE"
                entityId={venue.id}
                tableId="venues-console-change-logs"
              />
            )}
          </Stack>
        )
      }
    </QueryGuard>
  );
}
