import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { REPORT_COPY, type ReportableKind } from '@duncit/utils';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  /** A post or a story — picks the wording and the test ids. */
  kind: ReportableKind;
  /** Only true when the viewer may delete THIS item. */
  canDelete: boolean;
  /** False for the owner: nobody reviews a report against your own content. */
  canReport: boolean;
  onDelete: () => void;
  onReport: () => void;
  /** Distance from the top of the surface it floats over, under its 3-dot button. */
  top?: number;
}

/**
 * The test ids each kind's menu answers to. A story's predate posts having a
 * menu at all; a post's are the same strings mWeb's twin uses.
 */
const TEST_IDS: Record<ReportableKind, { menu: string; delete: string; report: string }> = {
  STORY: {
    menu: 'status-viewer-menu',
    delete: 'status-viewer-delete',
    report: 'status-viewer-report',
  },
  POST: {
    menu: 'post-actions-menu',
    delete: 'post-actions-menu-delete',
    report: 'post-actions-menu-report',
  },
};

/**
 * The dropdown behind the 3-dot button on user-generated content — an open
 * story or a post. mWeb twin: ContentActionsMenu (rule 27).
 *
 * Report is drawn for anyone looking at somebody else's content — that is the
 * whole point of it. Delete is drawn only when the viewer may delete it, so
 * nobody is offered a control that would refuse them.
 */
export function ContentActionsMenu({
  kind,
  canDelete,
  canReport,
  onDelete,
  onReport,
  top = 92,
}: Readonly<Props>) {
  const { color, danger } = useThemeColors();
  const { t } = useTranslation();
  const copy = REPORT_COPY[kind];
  const ids = TEST_IDS[kind];

  return (
    <YStack
      testID={ids.menu}
      role="menu"
      position="absolute"
      top={top}
      right={16}
      zIndex={20}
      backgroundColor="$surface"
      borderRadius={14}
      borderWidth={1}
      borderColor="$borderColor"
      overflow="hidden"
    >
      {canDelete ? (
        <XStack
          testID={ids.delete}
          role="menuitem"
          tabIndex={0}
          aria-label={t(copy.delete)}
          onPress={onDelete}
          alignItems="center"
          gap={8}
          minHeight={44}
          paddingHorizontal={16}
          paddingVertical={12}
          pressStyle={PRESS_STYLE.row}
        >
          <MaterialIcons name="delete-outline" size={18} color={danger} />
          <Text fontSize={14} fontWeight="600" color="$danger">
            {t(copy.delete)}
          </Text>
        </XStack>
      ) : null}
      {canReport ? (
        <XStack
          testID={ids.report}
          role="menuitem"
          tabIndex={0}
          aria-label={t(copy.report)}
          onPress={onReport}
          alignItems="center"
          gap={8}
          minHeight={44}
          paddingHorizontal={16}
          paddingVertical={12}
          pressStyle={PRESS_STYLE.row}
        >
          <MaterialIcons name="flag" size={18} color={color} />
          <Text fontSize={14} fontWeight="600" color="$color">
            {t(copy.report)}
          </Text>
        </XStack>
      ) : null}
    </YStack>
  );
}
