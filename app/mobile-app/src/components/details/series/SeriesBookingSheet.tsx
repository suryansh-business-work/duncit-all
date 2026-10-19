import { Text, YStack } from 'tamagui';

import { DuncitDialog } from '@/components/DuncitDialog';
import { useTranslation } from '@/hooks/useTranslation';
import { formatDateTime } from '@/utils/date-format';
import type { SeriesBooking } from '@/screens/PodDetailsScreen/useSeriesBooking';

import { CheckRow, SeriesConfirmButton, SeriesEstimate } from './SeriesBookingParts';

interface Props {
  series: SeriesBooking;
  isFree: boolean;
  formatPrice: (amount: number) => string;
}

/**
 * Book a recurring pod: tick the dates (the first open one starts ticked, or
 * "select all"), each at its own price, with what that costs — the multi-date
 * discount included. The checkout prices it again on the server; this is the
 * preview. mWeb twin: SeriesBookingDialog.
 */
export function SeriesBookingSheet({ series, isFree, formatPrice }: Readonly<Props>) {
  const { t } = useTranslation();
  const open = series.bookable;
  const count = series.chosen.length;
  const allState = count === 0 ? false : count === open.length || 'mixed';
  const confirmLabel = isFree
    ? t('mweb.podSeriesBooking.joinDates', { count })
    : t('mweb.podSeriesBooking.continue');

  const footer = (
    <SeriesConfirmButton
      label={confirmLabel}
      busy={series.busy}
      disabled={series.busy || count === 0}
      onConfirm={() => series.confirm()}
    />
  );

  return (
    <DuncitDialog
      open={series.open}
      onClose={() => series.setOpen(false)}
      testID="series-booking-sheet"
      title={t('mweb.podSeriesBooking.pickTitle')}
      closeLabel={t('mweb.podDetails.close')}
      footer={open.length > 0 ? footer : undefined}
    >
      {open.length === 0 ? (
        <Text fontSize={14} color="$muted" testID="series-booking-none">
          {t('mweb.podSeriesBooking.noneOpen')}
        </Text>
      ) : (
        <YStack gap={4} role="list" aria-label={t('mweb.podSeriesBooking.pickTitle')}>
          <CheckRow
            testID="series-booking-select-all"
            checked={allState}
            label={t('mweb.podSeriesBooking.selectAll')}
            onPress={series.toggleAll}
          />
          {open.map((row) => (
            <CheckRow
              key={row.pod_doc_id}
              testID={`series-booking-pick-${row.pod_doc_id}`}
              indent
              checked={series.picked.includes(row.pod_doc_id)}
              label={formatDateTime(row.start_at)}
              price={isFree ? undefined : formatPrice(series.netFor(row))}
              onPress={() => series.togglePicked(row.pod_doc_id)}
            />
          ))}
        </YStack>
      )}
      {!isFree && count > 0 ? (
        <SeriesEstimate count={count} estimate={series.estimate} formatPrice={formatPrice} />
      ) : null}
      {series.error ? (
        <Text fontSize={13} color="$danger" role="alert" marginTop={8}>
          {series.error}
        </Text>
      ) : null}
    </DuncitDialog>
  );
}
