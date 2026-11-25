import type { ReactNode } from 'react';
import { Modal, ScrollView } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

import { RADII } from '@/constants/design';
import { useTranslation } from '@/hooks/useTranslation';
import { TabIconButton } from './TabIconButton';

interface Props {
  open: boolean;
  title: string;
  /** A second line under the title (a URL, a file's details). */
  subtitle?: string;
  /** Back and the close button do nothing while an action runs. */
  busy?: boolean;
  onClose: () => void;
  children: ReactNode;
  testID: string;
}

/**
 * A sheet over the lead page — the phone's counterpart of the portal tabs'
 * dialogs (preview, rename, answers, page content): a titled card rising from
 * the bottom, its content scrolling inside, never the platform alert.
 */
export function TabSheet({
  open,
  title,
  subtitle,
  busy,
  onClose,
  children,
  testID,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const close = busy ? undefined : onClose;
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
      <YStack flex={1} justifyContent="flex-end" backgroundColor="$scrim">
        <YStack
          role="dialog"
          aria-label={title}
          backgroundColor="$surface"
          borderTopLeftRadius={RADII.lg}
          borderTopRightRadius={RADII.lg}
          borderWidth={1}
          borderColor="$borderColor"
          maxHeight="90%"
          testID={testID}
        >
          <XStack alignItems="center" gap="$2" padding="$4" paddingBottom="$2">
            <YStack flex={1}>
              <Text fontSize="$6" fontWeight="800" role="heading" numberOfLines={2}>
                {title}
              </Text>
              {subtitle ? (
                <Text color="$muted" fontSize="$2" selectable>
                  {subtitle}
                </Text>
              ) : null}
            </YStack>
            <TabIconButton
              icon="close"
              label={t('shell.common.close')}
              onPress={onClose}
              disabled={busy}
              size={24}
              testID={`${testID}-close`}
            />
          </XStack>
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 12 }}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </YStack>
      </YStack>
    </Modal>
  );
}
