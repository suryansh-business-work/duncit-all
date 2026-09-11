import { Modal } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  open: boolean;
  onClose: () => void;
  onHistory: () => void;
}

/** Native ALREADY_BOOKED dialog with the same copy and destination as mWeb. */
export function AlreadyBookedDialog({ open, onClose, onHistory }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Modal
      transparent
      visible={open}
      animationType="fade"
      onRequestClose={onClose}
      testID="already-booked-dialog"
    >
      <YStack
        flex={1}
        alignItems="center"
        justifyContent="center"
        padding={24}
        backgroundColor="rgba(0,0,0,0.55)"
      >
        <YStack
          width="100%"
          maxWidth={360}
          gap={12}
          padding={20}
          borderRadius={28}
          backgroundColor="$surface"
        >
          <Text fontSize={18} fontWeight="600" color="$color">
            {t('mweb.checkout.alreadyBookedTitle')}
          </Text>
          <Text fontSize={14} color="$muted">
            {t('mweb.checkout.alreadyBookedMessage')}
          </Text>
          <XStack gap={8} justifyContent="flex-end" flexWrap="wrap">
            <DuncitButton
              testID="already-booked-stay"
              label={t('mweb.checkout.alreadyBookedStay')}
              onPress={onClose}
              variant="outline"
              tone="neutral"
            />
            <DuncitButton
              testID="already-booked-history"
              label={t('mweb.checkout.alreadyBookedHistory')}
              onPress={onHistory}
            />
          </XStack>
        </YStack>
      </YStack>
    </Modal>
  );
}
