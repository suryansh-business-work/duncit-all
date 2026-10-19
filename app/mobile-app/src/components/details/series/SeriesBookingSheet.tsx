import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { bookableSeriesDates, SERIES_BOOKING_CHOICES } from '@duncit/utils';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { DuncitDialog } from '@/components/DuncitDialog';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { formatDateTime } from '@/utils/date-format';
import type { SeriesBooking } from '@/screens/PodDetailsScreen/useSeriesBooking';

import { SeriesConfirmButton, SeriesEstimate } from './SeriesBookingParts';

interface Props {
  series: SeriesBooking;
  isFree: boolean;
  formatPrice: (amount: number) => string;
}

interface OptionRowProps {
  testID: string;
  role: 'radio' | 'checkbox';
  checked: boolean;
  label: string;
  onPress: () => void;
  indent?: boolean;
}

/** Checked and unchecked icons for each kind of tickable row. */
const OPTION_ICONS = {
  radio: ['radio-button-checked', 'radio-button-unchecked'],
  checkbox: ['check-box', 'check-box-outline-blank'],
} as const;

/** One tickable row — a choice (radio) or a date (checkbox). */
function OptionRow({
  testID,
  role,
  checked,
  label,
  onPress,
  indent = false,
}: Readonly<OptionRowProps>) {
  const { primary, muted } = useThemeColors();
  const icon = OPTION_ICONS[role][checked ? 0 : 1];
  return (
    <XStack
      testID={testID}
      role={role}
      aria-checked={checked}
      aria-label={label}
      tabIndex={0}
      onPress={onPress}
      pressStyle={PRESS_STYLE.control}
      alignItems="center"
      gap={10}
      minHeight={44}
      paddingLeft={indent ? 32 : 0}
    >
      <MaterialIcons name={icon} size={22} color={checked ? primary : muted} />
      <Text fontSize={14} color="$color" flexShrink={1}>
        {label}
      </Text>
    </XStack>
  );
}

/**
 * Book a recurring pod: the next date, every date, or a hand-picked set —
 * with what that costs, the multi-date discount included. The checkout prices
 * it again on the server; this is the preview. mWeb twin: SeriesBookingDialog.
 */
export function SeriesBookingSheet({ series, isFree, formatPrice }: Readonly<Props>) {
  const { t } = useTranslation();
  const open = bookableSeriesDates(series.rows);
  const count = series.chosen.length;
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
        <YStack gap={4} role="radiogroup" aria-label={t('mweb.podSeriesBooking.pickTitle')}>
          {SERIES_BOOKING_CHOICES.map((option) => (
            <OptionRow
              key={option.value}
              testID={`series-booking-choice-${option.value}`}
              role="radio"
              checked={series.choice === option.value}
              label={t(option.labelKey, { count: open.length })}
              onPress={() => series.setChoice(option.value)}
            />
          ))}
          {series.choice === 'PICK'
            ? open.map((row) => (
                <OptionRow
                  key={row.pod_doc_id}
                  testID={`series-booking-pick-${row.pod_doc_id}`}
                  role="checkbox"
                  indent
                  checked={series.picked.includes(row.pod_doc_id)}
                  label={formatDateTime(row.start_at)}
                  onPress={() => series.togglePicked(row.pod_doc_id)}
                />
              ))
            : null}
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
