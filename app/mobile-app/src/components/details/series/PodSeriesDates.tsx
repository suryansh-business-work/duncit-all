import { Text, XStack, YStack } from 'tamagui';
import { SERIES_DATE_STATUS_KEY, type SeriesDateRow } from '@duncit/utils';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useTranslation } from '@/hooks/useTranslation';
import { formatDateTime } from '@/utils/date-format';
import type { SeriesBooking } from '@/screens/PodDetailsScreen/useSeriesBooking';

interface Props {
  series: SeriesBooking;
  /** The screen's own pod — its row is not a link to itself. */
  currentPodId: string;
  /** Hosts open any date to run it (attendance, completion). */
  isHost: boolean;
  onOpenDate: (datePodId: string) => void;
}

type Translate = ReturnType<typeof useTranslation>['t'];

/** Spots left on an upcoming date, or nothing for an unlimited one. */
function spotsText(row: SeriesDateRow, t: Translate): string | null {
  if (
    row.status !== 'UPCOMING' ||
    row.seats_available === null ||
    row.seats_available === undefined
  )
    return null;
  return row.seats_available > 0
    ? t('mweb.podSeriesBooking.spotsLeft', { count: row.seats_available })
    : t('mweb.podSeriesBooking.full');
}

/**
 * Every date of a recurring pod: when, how it stands, spots left, and whether
 * the viewer booked it. A booked date (or, for the host, any date) opens that
 * date's own screen — its ticket, backout and attendance live there. mWeb
 * twin: PodSeriesDatesSection.
 */
export function PodSeriesDates({ series, currentPodId, isHost, onOpenDate }: Readonly<Props>) {
  const { t } = useTranslation();
  if (!series.active || series.rows.length === 0) return null;
  const best = series.tiers.at(-1);
  return (
    <SurfaceCard testID="pod-series-dates" marginHorizontal={16} marginTop={20} gap={12}>
      <SectionHeader title={t('mweb.podSeriesBooking.datesTitle', { count: series.rows.length })} />
      {best ? (
        <Text fontSize={13} color="$success" testID="pod-series-discount-hint">
          {t('mweb.podSeriesBooking.discountHint', {
            vars: { pct: best.discount_pct, count: best.min_dates },
          })}
        </Text>
      ) : null}
      <YStack gap={10} role="list">
        {series.rows.map((row) => {
          const when = formatDateTime(row.start_at);
          const linked = (isHost || row.my_seats > 0) && row.pod_doc_id !== currentPodId;
          const spots = spotsText(row, t);
          return (
            <XStack
              key={row.pod_doc_id}
              testID={`pod-series-date-${row.pod_doc_id}`}
              role={linked ? 'link' : 'listitem'}
              aria-label={when}
              tabIndex={linked ? 0 : undefined}
              onPress={linked ? () => onOpenDate(row.pod_doc_id) : undefined}
              pressStyle={linked ? PRESS_STYLE.control : undefined}
              alignItems="center"
              gap={8}
              flexWrap="wrap"
              minHeight={44}
            >
              <Text flex={1} fontSize={14} color={linked ? '$accent' : '$color'}>
                {when}
              </Text>
              {row.my_seats > 0 ? (
                <Text fontSize={12} fontWeight="700" color="$primary">
                  {t('mweb.podSeriesBooking.booked')}
                </Text>
              ) : null}
              {spots ? (
                <Text fontSize={12} color="$muted">
                  {spots}
                </Text>
              ) : null}
              <Text fontSize={12} color="$muted">
                {t(SERIES_DATE_STATUS_KEY[row.status])}
              </Text>
            </XStack>
          );
        })}
      </YStack>
    </SurfaceCard>
  );
}
