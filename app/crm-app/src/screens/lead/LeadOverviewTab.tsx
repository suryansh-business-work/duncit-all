import { XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { useTranslation } from '@/hooks/useTranslation';
import { LeadOverviewDetails } from './tabs/LeadOverviewDetails';
import type { LeadTabProps } from './tabs/parts/tabTypes';

interface Props extends LeadTabProps {
  /** Opens another tab of the lead page (the score ring opens Quality). */
  onOpenTab: (tab: string) => void;
  onAddNote: () => void;
  onAddReminder: () => void;
}

/**
 * The lead's Overview tab: the portal's hero, stat tiles, overview cards and
 * Lead tracking card, then the quick Add note (a manual log) and Add reminder.
 */
export function LeadOverviewTab({ onAddNote, onAddReminder, ...tab }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <YStack gap="$3">
      <LeadOverviewDetails {...tab} />
      <XStack gap="$3">
        <YStack flex={1}>
          <DuncitButton
            label={t('crmApp.lead.addNote')}
            onPress={onAddNote}
            variant="outline"
            fullWidth
            testID="lead-add-note"
          />
        </YStack>
        <YStack flex={1}>
          <DuncitButton
            label={t('crmApp.lead.addReminder')}
            onPress={onAddReminder}
            variant="outline"
            fullWidth
            testID="lead-add-reminder"
          />
        </YStack>
      </XStack>
    </YStack>
  );
}
