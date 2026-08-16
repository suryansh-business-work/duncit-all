import { Modal } from 'react-native';
import { Button, Text, XStack, YStack } from 'tamagui';

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
          borderRadius={16}
          backgroundColor="$background"
        >
          <Text fontSize={18} fontWeight="700" color="$color">
            {t('mweb.checkout.alreadyBookedTitle')}
          </Text>
          <Text fontSize={14} color="$muted">
            {t('mweb.checkout.alreadyBookedMessage')}
          </Text>
          <XStack gap={8} justifyContent="flex-end" flexWrap="wrap">
            <Button testID="already-booked-stay" size="$3" onPress={onClose}>
              {t('mweb.checkout.alreadyBookedStay')}
            </Button>
            <Button testID="already-booked-history" size="$3" theme="active" onPress={onHistory}>
              {t('mweb.checkout.alreadyBookedHistory')}
            </Button>
          </XStack>
        </YStack>
      </YStack>
    </Modal>
  );
}
