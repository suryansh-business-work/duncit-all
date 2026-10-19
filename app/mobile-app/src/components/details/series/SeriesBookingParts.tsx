import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { SeriesBooking } from '@/screens/PodDetailsScreen/useSeriesBooking';

interface CheckRowProps {
  testID: string;
  /** `mixed` for "select all" when only some dates are ticked. */
  checked: boolean | 'mixed';
  label: string;
  /** The date's own price, right-aligned; omitted for a free pod. */
  price?: string;
  onPress: () => void;
  indent?: boolean;
}

/** One checkbox row of the sheet — "select all", or a date with its price. */
export function CheckRow({
  testID,
  checked,
  label,
  price,
  onPress,
  indent = false,
}: Readonly<CheckRowProps>) {
  const { primary, muted } = useThemeColors();
  let icon: 'check-box' | 'check-box-outline-blank' | 'indeterminate-check-box' =
    'check-box-outline-blank';
  if (checked === 'mixed') icon = 'indeterminate-check-box';
  else if (checked) icon = 'check-box';
  const accessibleLabel = price ? `${label}, ${price}` : label;
  return (
    <XStack
      testID={testID}
      role="checkbox"
      aria-checked={checked}
      aria-label={accessibleLabel}
      tabIndex={0}
      onPress={onPress}
      pressStyle={PRESS_STYLE.control}
      alignItems="center"
      gap={10}
      minHeight={44}
      paddingLeft={indent ? 12 : 0}
    >
      <MaterialIcons name={icon} size={22} color={checked ? primary : muted} />
      <Text fontSize={14} color="$color" flex={1}>
        {label}
      </Text>
      {price ? (
        <Text fontSize={14} fontWeight="700" color="$color">
          {price}
        </Text>
      ) : null}
    </XStack>
  );
}

interface ConfirmProps {
  label: string;
  busy: boolean;
  disabled: boolean;
  onConfirm: () => void;
}

/** The series sheet's footer button: join the dates, or continue to pay. */
export function SeriesConfirmButton({ label, busy, disabled, onConfirm }: Readonly<ConfirmProps>) {
  const { onPrimary } = useThemeColors();
  return (
    <XStack
      testID="series-booking-confirm"
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-disabled={disabled}
      onPress={disabled ? undefined : onConfirm}
      height={48}
      alignItems="center"
      justifyContent="center"
      gap={8}
      borderRadius={999}
      backgroundColor="$primary"
      opacity={disabled ? 0.6 : 1}
      pressStyle={PRESS_STYLE.control}
    >
      {busy ? <Spinner size="small" color={onPrimary} /> : null}
      <Text fontSize={14} fontWeight="700" color={onPrimary}>
        {label}
      </Text>
    </XStack>
  );
}

interface EstimateProps {
  count: number;
  estimate: SeriesBooking['estimate'];
  formatPrice: (amount: number) => string;
}

/** What the picked dates cost before checkout: gross, the multi-date discount, the total. */
export function SeriesEstimate({ count, estimate, formatPrice }: Readonly<EstimateProps>) {
  const { t } = useTranslation();
  return (
    <YStack gap={4} marginTop={12} testID="series-booking-estimate">
      <Text fontSize={13} color="$muted">
        {t('mweb.podSeriesBooking.datesCount', { count })} · {formatPrice(estimate.gross)}
      </Text>
      {estimate.discount > 0 ? (
        <Text fontSize={13} color="$success">
          {t('mweb.podSeriesBooking.discountRow', { vars: { pct: estimate.pct, count } })} −{' '}
          {formatPrice(estimate.discount)}
        </Text>
      ) : null}
      <Text fontSize={15} fontWeight="700" color="$color">
        {t('mweb.podSeriesBooking.estimateTotal', {
          vars: { amount: formatPrice(estimate.total) },
        })}
      </Text>
    </YStack>
  );
}
