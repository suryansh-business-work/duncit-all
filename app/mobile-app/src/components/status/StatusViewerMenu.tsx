import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  /** Only true when the server said this viewer may delete THIS slide. */
  canDelete: boolean;
  canReport: boolean;
  onDelete: () => void;
  onReport: () => void;
}

/**
 * The dropdown behind the 3-dot button on an open story. mWeb twin (rule 27).
 *
 * Report is drawn for anyone who can see the story — that is the whole point of
 * it. Delete is drawn only when the server's `can_delete` said yes, so a viewer
 * is never offered a control that would refuse them.
 */
export function StatusViewerMenu({ canDelete, canReport, onDelete, onReport }: Readonly<Props>) {
  const { color, danger } = useThemeColors();
  const { t } = useTranslation();

  return (
    <YStack
      testID="status-viewer-menu"
      position="absolute"
      top={92}
      right={16}
      zIndex={20}
      backgroundColor="$surface"
      borderRadius={12}
      borderWidth={1}
      borderColor="$borderColor"
      overflow="hidden"
    >
      {canDelete ? (
        <XStack
          testID="status-viewer-delete"
          role="button"
          aria-label={t('contentReport.delete')}
          onPress={onDelete}
          alignItems="center"
          gap={8}
          paddingHorizontal={16}
          paddingVertical={12}
          pressStyle={{ opacity: 0.7 }}
        >
          <MaterialIcons name="delete-outline" size={18} color={danger} />
          <Text fontSize={14} fontWeight="600" color="$danger">
            {t('contentReport.delete')}
          </Text>
        </XStack>
      ) : null}
      {canReport ? (
        <XStack
          testID="status-viewer-report"
          role="button"
          aria-label={t('contentReport.report')}
          onPress={onReport}
          alignItems="center"
          gap={8}
          paddingHorizontal={16}
          paddingVertical={12}
          pressStyle={{ opacity: 0.7 }}
        >
          <MaterialIcons name="flag" size={18} color={color} />
          <Text fontSize={14} fontWeight="600" color="$color">
            {t('contentReport.report')}
          </Text>
        </XStack>
      ) : null}
    </YStack>
  );
}
