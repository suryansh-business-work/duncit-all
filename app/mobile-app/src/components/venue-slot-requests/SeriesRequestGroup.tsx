import { useState, type ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { DuncitButton } from '@/components/DuncitButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import type { SlotRequestRow } from '@/hooks/useVenueSlotRequests';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { formatDateTime } from '@/utils/date-format';

interface Props {
  rows: SlotRequestRow[];
  busy: boolean;
  onApproveAll: () => void;
  onDeclineAll: () => void;
  /** Each date's own request card, so one date can still be answered alone. */
  renderRow: (row: SlotRequestRow) => ReactNode;
}

/** Every pending date of one recurring pod as one card — accept or decline them
 * all, or open the list and answer each date. Twin of `@duncit/ui`'s
 * SeriesRequestGroup on mWeb and the Partners console (rule 27). */
export function SeriesRequestGroup({
  rows,
  busy,
  onApproveAll,
  onDeclineAll,
  renderRow,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { muted } = useThemeColors();
  const [open, setOpen] = useState(false);
  const [first] = rows;
  if (!first) return null;
  const last = rows.reduce((_, row) => row, first);
  return (
    <SurfaceCard gap={12} testID={`slot-series-${first.series_id}`}>
      <Text fontSize={16} fontWeight="600" role="heading">
        {first.pod_title}
      </Text>
      <Text fontSize={13} color="$muted">
        {t('mweb.podSeries.requestSummary', {
          vars: {
            count: rows.length,
            from: formatDateTime(first.start_at),
            to: formatDateTime(last.start_at),
          },
        })}
      </Text>
      <XStack gap={10}>
        <YStack flex={1}>
          <DuncitButton
            testID="slot-series-approve-all"
            label={t('mweb.podSeries.acceptAll', { vars: { count: rows.length } })}
            disabled={busy}
            fullWidth
            onPress={onApproveAll}
          />
        </YStack>
        <YStack flex={1}>
          <DuncitButton
            testID="slot-series-decline-all"
            label={t('mweb.podSeries.declineAllShort')}
            variant="outline"
            tone="danger"
            disabled={busy}
            fullWidth
            onPress={onDeclineAll}
          />
        </YStack>
      </XStack>
      <XStack
        testID="slot-series-each"
        role="button"
        aria-expanded={open}
        tabIndex={0}
        onPress={() => setOpen((v) => !v)}
        pressStyle={PRESS_STYLE.inline}
        alignItems="center"
        justifyContent="space-between"
        minHeight={44}
      >
        <Text fontSize={14} fontWeight="600">
          {t('mweb.podSeries.answerEach')}
        </Text>
        <MaterialIcons name={open ? 'expand-less' : 'expand-more'} size={22} color={muted} />
      </XStack>
      {open ? <YStack gap={12}>{rows.map((row) => renderRow(row))}</YStack> : null}
    </SurfaceCard>
  );
}
