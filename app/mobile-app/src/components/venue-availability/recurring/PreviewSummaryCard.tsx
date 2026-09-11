import { Text, XStack } from 'tamagui';
import { formatMoney } from '@duncit/utils';
import type { PreviewSummary } from '@duncit/slots';

import { SurfaceCard } from '@/components/SurfaceCard';
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
    <SurfaceCard testID="recurring-preview" gap={8}>
      <Text fontSize={12} fontWeight="600" color="$muted">
        {t('availability.recurring.preview.slotsToCreate')}
      </Text>
      <Text testID="recurring-preview-total" fontSize={24} fontWeight="700" color="$color">
        {t('availability.recurring.preview.slotsCount', { vars: { count: summary.total } })}
      </Text>
      {spaceLabels.map((label) => {
        const bucket = summary.bySpace[label];
        if (!bucket) return null;
        return (
          <XStack key={label || 'whole-venue'} justifyContent="space-between" gap={8}>
            <Text flex={1} fontSize={13} fontWeight="600" color="$color" numberOfLines={1}>
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
        <Text fontSize={12} fontWeight="600" color="$muted">
          {t('availability.recurring.preview.totalRevenue')}
        </Text>
        <Text testID="recurring-preview-revenue" fontSize={18} fontWeight="700" color="$color">
          {formatMoney(summary.estimatedRevenue)}
        </Text>
      </XStack>
      {skips.length > 0 ? (
        <Text fontSize={11.5} color="$muted">
          {t('availability.recurring.preview.autoSkipped', { vars: { list: skips.join(' · ') } })}
        </Text>
      ) : null}
    </SurfaceCard>
  );
}
