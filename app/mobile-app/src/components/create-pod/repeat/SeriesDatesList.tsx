import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { POD_SERIES_SKIP_REASON_KEY } from '@duncit/utils';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { formatDateTime } from '@/utils/date-format';
import type { SeriesPreviewDate } from './useSeriesPreview';

interface Props {
  dates: SeriesPreviewDate[];
  /** ISO starts the host unticked. */
  skipped: readonly string[];
  onToggle: (startAt: string, include: boolean) => void;
}

/** The dates a recurring plan produces: a tickable row for each date that can
 * run, a greyed row with the venue's reason for each that cannot. mWeb twin. */
export function SeriesDatesList({ dates, skipped, onToggle }: Readonly<Props>) {
  const { t } = useTranslation();
  const { primary, muted } = useThemeColors();
  const skip = new Set(skipped);
  return (
    <YStack
      gap={2}
      testID="pod-series-dates"
      role="list"
      aria-label={t('mweb.podSeries.datesLabel')}
    >
      {dates.map((date) => {
        const when = formatDateTime(date.start_at);
        if (!date.available) {
          return (
            <XStack
              key={date.start_at}
              testID={`pod-series-date-off-${date.start_at}`}
              gap={8}
              paddingVertical={8}
              paddingLeft={32}
            >
              <Text fontSize={13} color="$muted" textDecorationLine="line-through">
                {when}
              </Text>
              {date.reason ? (
                <Text fontSize={12} color="$muted">
                  · {t(POD_SERIES_SKIP_REASON_KEY[date.reason])}
                </Text>
              ) : null}
            </XStack>
          );
        }
        const included = !skip.has(date.start_at);
        const label =
          date.price != null && date.price > 0
            ? t('mweb.podSeries.dateWithPrice', { vars: { date: when, price: date.price } })
            : when;
        return (
          <XStack
            key={date.start_at}
            testID={`pod-series-date-${date.start_at}`}
            role="checkbox"
            aria-checked={included}
            aria-label={label}
            tabIndex={0}
            onPress={() => onToggle(date.start_at, !included)}
            pressStyle={PRESS_STYLE.control}
            alignItems="center"
            gap={10}
            minHeight={44}
          >
            <MaterialIcons
              name={included ? 'check-box' : 'check-box-outline-blank'}
              size={22}
              color={included ? primary : muted}
            />
            <Text fontSize={14} color="$color" flexShrink={1}>
              {label}
            </Text>
          </XStack>
        );
      })}
    </YStack>
  );
}
