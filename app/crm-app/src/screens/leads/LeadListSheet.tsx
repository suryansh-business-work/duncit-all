import type { ReactNode } from 'react';
import { Modal, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack, useTheme } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  /** While something runs, Back and the close button wait. */
  busy?: boolean;
  children: ReactNode;
  testID: string;
}

/**
 * A full-screen sheet over a lead listing — the portal's dialogs (Filters,
 * Nearby leads, Fill with AI, Import) on the phone: a titled page with a close
 * button, its content scrolling under it.
 */
export function LeadListSheet({ open, title, onClose, busy, children, testID }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <Modal visible={open} animationType="slide" onRequestClose={busy ? undefined : onClose}>
      <YStack flex={1} backgroundColor="$background" testID={testID}>
        <XStack
          alignItems="center"
          gap="$2"
          paddingHorizontal="$4"
          paddingVertical="$3"
          borderBottomWidth={1}
          borderColor="$borderColor"
        >
          <Text flex={1} fontSize="$6" fontWeight="800" role="heading">
            {title}
          </Text>
          <XStack
            role="button"
            aria-label={t('shell.common.close')}
            aria-disabled={busy}
            onPress={busy ? undefined : onClose}
            padding="$2"
            hitSlop={8}
            testID={`${testID}-close`}
          >
            <MaterialIcons name="close" size={24} color={theme.color?.val} />
          </XStack>
        </XStack>
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 12 }}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </YStack>
    </Modal>
  );
}
