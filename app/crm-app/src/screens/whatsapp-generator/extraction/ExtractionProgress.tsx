import { ScrollView } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';
import { waExtractionPercent, waExtractionView, type CrmTone } from '@duncit/utils';

import { ToneChip } from '@/components/ToneChip';
import { RADII } from '@/constants/design';
import type { WaJob } from '@/features/whatsapp-generator/extractionStore';
import { WA_TONE_COLOR } from '@/features/whatsapp-generator/format';
import { useTranslation } from '@/hooks/useTranslation';

/** The progress bar and its caption: contacts processed out of the total while running. */
export function ExtractionProgress({ job }: Readonly<{ job: WaJob }>) {
  const { t } = useTranslation();
  const running = job.status === 'RUNNING';
  const pct = waExtractionPercent(job);
  const value = running ? pct : 100;
  const tone = waExtractionView(job.status).tone;
  let caption = t('crm.tools.contactsProcessed', { count: job.processed });
  if (running && job.total > 0)
    caption = t('crm.tools.contactsProgress', {
      vars: { processed: job.processed, total: job.total, pct },
    });
  else if (running)
    caption = t('crm.tools.contactsProgressUnknown', { vars: { processed: job.processed, pct } });
  return (
    <YStack gap="$1">
      <YStack
        role="progressbar"
        accessibilityValue={
          running && job.total === 0 ? undefined : { min: 0, max: 100, now: value }
        }
        height={6}
        borderRadius={RADII.pill}
        backgroundColor="$soft"
        overflow="hidden"
        testID="wa-extraction-bar"
      >
        <YStack height="100%" width={`${value}%`} backgroundColor={`$${WA_TONE_COLOR[tone]}`} />
      </YStack>
      <Text color="$muted" fontSize="$2" aria-live="polite">
        {caption}
      </Text>
    </YStack>
  );
}

/** The quality breakdown as chips: valid, invalid, duplicates and the new leads. */
export function ExtractionStats({ job }: Readonly<{ job: WaJob }>) {
  const { t } = useTranslation();
  const stats: { label: string; tone: CrmTone }[] = [
    { label: t('crm.tools.validCount', { count: job.valid }), tone: 'success' },
    { label: t('crm.tools.invalidCount', { count: job.invalid }), tone: 'error' },
    { label: t('crm.tools.duplicatesCount', { count: job.duplicates }), tone: 'warning' },
    { label: t('crm.tools.newLeadsCount', { count: job.leads_created }), tone: 'info' },
  ];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <XStack gap="$2">
        {stats.map((s) => (
          <ToneChip key={s.label} label={s.label} tone={s.tone} />
        ))}
      </XStack>
    </ScrollView>
  );
}
