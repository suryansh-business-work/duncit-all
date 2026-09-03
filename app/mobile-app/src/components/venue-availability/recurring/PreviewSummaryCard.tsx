import { Text, XStack, YStack } from 'tamagui';
import { formatMoney } from '@duncit/utils';
import type { PreviewSummary } from '@duncit/slots';

import type { Translate } from '@/i18n/fallback';
import { useTranslation } from '@/hooks/useTranslation';

/** The "auto-skipped" line: only the reasons that skipped something. */
function skipLines(summary: PreviewSummary, maxAdvanceDays: number, t: Translate): string[] {
  const lines: string[] = [];
  const {
    skippedWeeklyOff: weeklyOff,
    skippedHolidays: holidays,
    skippedPast: past,
    skippedBeyondCap: beyond,
  } = summary;
  if (weeklyOff) {
    lines.push(t('availability.recurring.preview.skipWeeklyOff', { vars: { count: weeklyOff } }));
  }
  if (holidays) {
    lines.push(t('availability.recurring.preview.skipHoliday', { vars: { count: holidays } }));
  }
  if (past) lines.push(t('availability.recurring.preview.skipPast', { vars: { count: past } }));
  if (beyond) {
    lines.push(
      t('availability.recurring.preview.skipBeyondCap', {
        vars: { count: beyond, days: maxAdvanceDays },
      }),
    );
  }
  return lines;
}

interface Props {
  summary: PreviewSummary;
  maxAdvanceDays: number;
}

/** The live preview: how many slots the run creates, per space, and what they
 * are worth — the Tamagui twin of the MUI PreviewBar (rule 27). */
export function PreviewSummaryCard({ summary, maxAdvanceDays }: Readonly<Props>) {
  const { t } = useTranslation();
  const spaceLabels = Object.keys(summary.bySpace).sort((a, b) => a.localeCompare(b));
  const skips = skipLines(summary, maxAdvanceDays, t);

  return (
    <YStack
      testID="recurring-preview"
      gap={8}
      padding={12}
      borderRadius={12}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      <Text fontSize={11} fontWeight="700" color="$muted">
        {t('availability.recurring.preview.slotsToCreate')}
      </Text>
      <Text testID="recurring-preview-total" fontSize={22} fontWeight="800" color="$primary">
        {t('availability.recurring.preview.slotsCount', { vars: { count: summary.total } })}
      </Text>
      {spaceLabels.map((label) => {
        const bucket = summary.bySpace[label];
        if (!bucket) return null;
        return (
          <XStack key={label || 'whole-venue'} justifyContent="space-between" gap={8}>
            <Text flex={1} fontSize={12.5} fontWeight="700" color="$color" numberOfLines={1}>
              {label || t('availability.wholeVenue')}
            </Text>
            <Text fontSize={12} color="$muted">
              {t('availability.recurring.preview.slotsCount', { vars: { count: bucket.count } })}
              {' · '}
              {t('availability.recurring.preview.priceCap', {
                vars: { price: formatMoney(bucket.price), capacity: bucket.capacity },
              })}
            </Text>
          </XStack>
        );
      })}
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize={11} fontWeight="700" color="$muted">
          {t('availability.recurring.preview.totalRevenue')}
        </Text>
        <Text testID="recurring-preview-revenue" fontSize={16} fontWeight="800" color="$color">
          {formatMoney(summary.estimatedRevenue)}
        </Text>
      </XStack>
      {skips.length > 0 ? (
        <Text fontSize={11.5} color="$muted">
          {t('availability.recurring.preview.autoSkipped', { vars: { list: skips.join(' · ') } })}
        </Text>
      ) : null}
    </YStack>
  );
}
