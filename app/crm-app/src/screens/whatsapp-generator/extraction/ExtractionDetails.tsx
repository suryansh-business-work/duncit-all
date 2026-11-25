import { Modal } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { RADII } from '@/constants/design';
import type { WaJob } from '@/features/whatsapp-generator/extractionStore';
import { useTranslation } from '@/hooks/useTranslation';
import { navigationRef } from '@/navigation/navigationRef';

interface Props {
  job: WaJob;
  open: boolean;
  onClose: () => void;
}

/**
 * The extraction summary — the portal's stats dialog — with a way to the
 * WhatsApp Leads the job created.
 */
export function ExtractionDetails({ job, open, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const rows: [string, string][] = [
    [t('shell.common.status'), job.status],
    [t('crm.common.communities'), String(job.communities)],
    [t('crm.common.groups'), String(job.groups)],
    [t('crm.tools.contactsProcessedLabel'), `${job.processed} / ${job.total}`],
    [t('crm.tools.validNumbers'), String(job.valid)],
    [t('crm.tools.invalidSkipped'), String(job.invalid)],
    [t('crm.tools.duplicatesAlreadySaved'), String(job.duplicates)],
    [t('crm.tools.newLeadsCreated'), String(job.leads_created)],
  ];
  const openLeads = () => {
    onClose();
    if (navigationRef.isReady()) navigationRef.navigate('UserLeads');
  };
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <YStack flex={1} justifyContent="center" padding="$5" backgroundColor="$scrim">
        <YStack
          role="alertdialog"
          aria-label={t('crm.tools.extractionSummary')}
          backgroundColor="$surface"
          borderRadius={RADII.lg}
          borderWidth={1}
          borderColor="$borderColor"
          padding="$5"
          gap="$2"
          testID="wa-extraction-summary"
        >
          <Text fontWeight="700" fontSize="$6" role="heading" marginBottom="$1">
            {t('crm.tools.extractionSummary')}
          </Text>
          {rows.map(([label, value]) => (
            <XStack key={label} justifyContent="space-between" gap="$3">
              <Text flex={1} color="$muted">
                {label}
              </Text>
              <Text fontWeight="700">{value}</Text>
            </XStack>
          ))}
          {job.error ? (
            <Text color="$danger" role="alert" testID="wa-extraction-summary-error">
              {job.error}
            </Text>
          ) : null}
          <YStack gap="$2" marginTop="$3">
            <DuncitButton
              label={t('shell.nav.whatsappLeads')}
              onPress={openLeads}
              variant="outline"
              fullWidth
              testID="wa-extraction-leads"
            />
            <DuncitButton
              label={t('shell.common.close')}
              onPress={onClose}
              variant="ghost"
              fullWidth
              testID="wa-extraction-summary-close"
            />
          </YStack>
        </YStack>
      </YStack>
    </Modal>
  );
}
