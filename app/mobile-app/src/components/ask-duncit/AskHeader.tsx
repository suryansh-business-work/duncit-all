import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { roleLabelKey } from '@duncit/utils';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { AskIconButton } from './AskIconButton';

interface Props {
  roleKey: string | null;
  showHistory: boolean;
  canHandOver: boolean;
  onHistory: () => void;
  onNew: () => void;
  onHandOver: () => void;
}

/** Title bar with the role the assistant acts for — the twin of mWeb's AskDuncitHeader. */
export function AskHeader({
  roleKey,
  showHistory,
  canHandOver,
  onHistory,
  onNew,
  onHandOver,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { primary } = useThemeColors();
  return (
    <XStack
      alignItems="center"
      gap={8}
      paddingHorizontal={12}
      paddingVertical={8}
      borderBottomWidth={1}
      borderColor="$borderColor"
    >
      <MaterialIcons name="assistant" size={24} color={primary} />
      <YStack flex={1} minWidth={0}>
        <XStack alignItems="center" gap={6}>
          <Text fontSize={18} fontWeight="700" color="$color" role="heading">
            {t('askDuncit.title')}
          </Text>
          <Text
            testID="ask-duncit-beta"
            accessibilityLabel={t('askDuncit.betaHint')}
            fontSize={11}
            fontWeight="700"
            color="$warning"
            borderWidth={1}
            borderColor="$warning"
            borderRadius={999}
            paddingHorizontal={8}
          >
            {t('askDuncit.beta')}
          </Text>
        </XStack>
        {roleKey ? (
          <XStack alignItems="center" gap={6}>
            <Text fontSize={12} color="$muted">
              {t('askDuncit.actingAs')}
            </Text>
            <Text
              testID="ask-duncit-role"
              fontSize={12}
              fontWeight="600"
              color="$primary"
              borderWidth={1}
              borderColor="$primary"
              borderRadius={999}
              paddingHorizontal={8}
            >
              {t(roleLabelKey(roleKey))}
            </Text>
          </XStack>
        ) : null}
      </YStack>
      {canHandOver && (
        <AskIconButton
          icon="support-agent"
          label={t('askDuncit.handover.open')}
          onPress={onHandOver}
        />
      )}
      <AskIconButton icon="add-comment" label={t('askDuncit.newChat')} onPress={onNew} />
      {showHistory && (
        <AskIconButton icon="history" label={t('askDuncit.history.open')} onPress={onHistory} />
      )}
    </XStack>
  );
}
