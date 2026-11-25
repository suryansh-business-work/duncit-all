import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack, useTheme } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  open: boolean;
  title: string;
  /** Back and the close button do nothing while a save runs. */
  busy?: boolean;
  onClose: () => void;
  /** The actions under the content (Cancel, Save). */
  footer: ReactNode;
  children: ReactNode;
  testID: string;
}

/**
 * A portal dialog with a form on a phone: a full-height sheet with its title,
 * a close button, the content scrolling above the keyboard and the actions
 * kept in reach at the bottom.
 */
export function SheetModal({
  open,
  title,
  busy,
  onClose,
  footer,
  children,
  testID,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={open}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={busy ? undefined : onClose}
    >
      <KeyboardAvoidingView behavior="height" style={{ flex: 1 }}>
        {/* Android draws the sheet edge to edge; an iOS page sheet already starts below the status bar. */}
        <YStack
          flex={1}
          paddingTop={Platform.OS === 'ios' ? 0 : insets.top}
          paddingBottom={insets.bottom}
          backgroundColor="$background"
          role="dialog"
          aria-label={title}
          testID={testID}
        >
          <XStack
            alignItems="center"
            gap="$2"
            paddingHorizontal="$4"
            paddingVertical="$3"
            borderBottomWidth={1}
            borderColor="$borderColor"
          >
            <Text flex={1} fontSize="$6" fontWeight="800" role="heading" numberOfLines={2}>
              {title}
            </Text>
            <XStack
              role="button"
              aria-label={t('shell.common.close')}
              aria-disabled={busy}
              padding="$2"
              hitSlop={8}
              onPress={busy ? undefined : onClose}
              testID={`${testID}-close`}
            >
              <MaterialIcons name="close" size={22} color={theme.color?.val} />
            </XStack>
          </XStack>
          <ScrollView
            contentContainerStyle={{ padding: 16, gap: 12 }}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
          <XStack
            justifyContent="flex-end"
            gap="$2"
            padding="$4"
            borderTopWidth={1}
            borderColor="$borderColor"
          >
            {footer}
          </XStack>
        </YStack>
      </KeyboardAvoidingView>
    </Modal>
  );
}
