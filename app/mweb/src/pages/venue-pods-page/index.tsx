import { useQuery } from '@apollo/client/react';
import { Card, CardContent, Stack } from '@mui/material';
import EventNoteRoundedIcon from '@mui/icons-material/EventNoteRounded';
import { DuncitTabs, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import { podsByPhase, type VenuePodPhase } from '@duncit/utils';
import {
  EMPTY_STUDIO_SUMMARY,
  StudioPodsBody,
  VENUE_STUDIO_PODS,
  type StudioPod,
  type StudioPodSummary,
} from '../../components/studio-pods';
import { useSelectedVenue } from '../../hooks/useSelectedVenue';
import { useTranslation } from '../../i18n/useTranslation';
import VenuePageFrame from '../venue-manage-page/VenuePageFrame';
import { MY_VENUES_SWITCHER } from '../venue-manage-page/queries';
import { useVenuePodActions } from '../venue-manage-page/useVenuePodActions';

/** One venue's pods, split into the three phase tabs, with the venue row actions. */
function VenuePhaseTabs({ venueId }: Readonly<{ venueId: string }>) {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery<{ studioPods: StudioPod[]; studioSummary: StudioPodSummary }>(
    VENUE_STUDIO_PODS,
    { variables: { venue_id: venueId }, fetchPolicy: 'cache-and-network' },
  );
  const summary = data?.studioSummary ?? EMPTY_STUDIO_SUMMARY;
  const actions = useVenuePodActions({ currencySymbol: summary.currency_symbol, refetch });
  const items: DuncitTabItem<VenuePodPhase>[] = [
    { value: 'UPCOMING', label: t('mweb.studioOptions.podsUpcoming'), testId: 'venue-pods-tab-upcoming' },
    { value: 'CURRENT', label: t('mweb.studioOptions.podsCurrent'), testId: 'venue-pods-tab-current' },
    { value: 'PAST', label: t('mweb.studioOptions.podsPast'), testId: 'venue-pods-tab-past' },
  ];
  const emptyText: Record<VenuePodPhase, string> = {
    UPCOMING: t('mweb.studioOptions.noPodsUpcoming'),
    CURRENT: t('mweb.studioOptions.noPodsCurrent'),
    PAST: t('mweb.studioOptions.noPodsPast'),
  };
  const tabs = useTabParam<VenuePodPhase>({ items, fallback: 'UPCOMING', param: 'selectedtab' });
  const phases = podsByPhase(data?.studioPods ?? []);

  return (
    <Stack spacing={1.5}>
      <DuncitTabs {...tabs} variant="fullWidth" />
      <Card data-testid="venue-pods">
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <StudioPodsBody
            loading={loading && !data}
            failed={!!error && !data}
            pods={phases[tabs.value]}
            emptyText={emptyText[tabs.value]}
            currencySymbol={summary.currency_symbol}
            onRetry={() => {
              refetch().catch((retryError: unknown) => console.warn('[VenuePodsPage] retry failed', retryError));
            }}
            sectionId="venue-pods"
            {...actions.rowActions}
          />
        </CardContent>
      </Card>
      {actions.dialogs}
    </Stack>
  );
}

/**
 * Venue Options → Pods at Your Venue: the selected venue's pods in three tabs —
 * Upcoming, Current (running right now) and Past (finished or cancelled) —
 * split by the server's own bucket (`podsByPhase`), so every app and the
 * Partner console file a pod under the same tab.
 */
export default function VenuePodsPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery(MY_VENUES_SWITCHER, { fetchPolicy: 'cache-and-network' });
  const venues = data?.myVenues ?? [];
  const { venue, selectVenue } = useSelectedVenue(venues);

  return (
    <VenuePageFrame
      icon={<EventNoteRoundedIcon fontSize="small" />}
      title={t('mweb.studioOptions.venuePods')}
      venues={venues}
      venue={venue}
      onSelect={selectVenue}
      loading={loading && !data}
      error={error}
      noVenuesMessage={t('mweb.studioOptions.noVenuesYet')}
    >
      {venue && <VenuePhaseTabs venueId={venue.id} />}
    </VenuePageFrame>
  );
}
