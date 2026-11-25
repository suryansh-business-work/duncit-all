import { Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack, useTheme } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { RADII } from '@/constants/design';
import { useTranslation } from '@/hooks/useTranslation';

export interface SheetAction {
  key: string;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

interface Props {
  open: boolean;
  title: string;
  actions: readonly SheetAction[];
  onClose: () => void;
  testID: string;
}

/** The portal's per-item actions menu as a sheet from the bottom; picking one closes it first. */
export function ActionSheet({ open, title, actions, onClose, testID }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <YStack flex={1} justifyContent="flex-end" backgroundColor="$scrim">
        <YStack
          role="menu"
          aria-label={title}
          backgroundColor="$surface"
          borderTopLeftRadius={RADII.lg}
          borderTopRightRadius={RADII.lg}
          padding="$4"
          gap="$1"
          testID={testID}
        >
          <Text fontWeight="700" fontSize="$5" role="heading" marginBottom="$2" numberOfLines={1}>
            {title}
          </Text>
          {actions.map((action) => (
            <XStack
              key={action.key}
              role="menuitem"
              aria-label={action.label}
              aria-disabled={Boolean(action.disabled)}
              minHeight={48}
              alignItems="center"
              gap="$3"
              paddingHorizontal="$2"
              borderRadius={RADII.sm}
              opacity={action.disabled ? 0.4 : 1}
              pressStyle={{ backgroundColor: '$soft' }}
              onPress={
                action.disabled
                  ? undefined
                  : () => {
                      onClose();
                      action.onPress();
                    }
              }
              testID={`${testID}-${action.key}`}
            >
              <MaterialIcons
                name={action.icon}
                size={20}
                color={action.destructive ? theme.danger?.val : theme.muted?.val}
              />
              <Text color={action.destructive ? '$danger' : '$color'}>{action.label}</Text>
            </XStack>
          ))}
          <DuncitButton
            label={t('shell.common.cancel')}
            onPress={onClose}
            variant="ghost"
            fullWidth
            testID={`${testID}-cancel`}
          />
        </YStack>
      </YStack>
    </Modal>
  );
}
