import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';
import type { MenuEntry } from './profileSections';

/** A move-up / move-down control beside a picked row. */
function MoveButton({
  icon,
  label,
  disabled,
  onPress,
  testID,
}: Readonly<{
  icon: 'arrow-upward' | 'arrow-downward';
  label: string;
  disabled: boolean;
  onPress: () => void;
  testID: string;
}>) {
  const { muted, color } = useThemeColors();
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      aria-disabled={disabled}
      tabIndex={disabled ? undefined : 0}
      onPress={disabled ? undefined : onPress}
      width={44}
      height={44}
      alignItems="center"
      justifyContent="center"
      borderRadius={22}
      opacity={disabled ? 0.4 : 1}
      pressStyle={disabled ? undefined : PRESS_STYLE.ghost}
    >
      <MaterialIcons name={icon} size={20} color={disabled ? muted : color} />
    </XStack>
  );
}

/**
 * One destination in the Quick Access editor: a checkbox row (tap to pick or
 * unpick) and, while picked, the controls that move it up or down the grid.
 */
export function QuickAccessEditorRow({
  entry,
  index,
  picked,
  pickedCount,
  full,
  onToggle,
  onMove,
}: Readonly<{
  entry: MenuEntry;
  /** Position among the picked tiles; ignored while unpicked. */
  index: number;
  picked: boolean;
  pickedCount: number;
  /** Six are picked — an unpicked row cannot be added. */
  full: boolean;
  onToggle: () => void;
  onMove: (step: -1 | 1) => void;
}>) {
  const { t } = useTranslation();
  const { accent, muted } = useThemeColors();
  const blocked = !picked && full;
  return (
    <XStack alignItems="center" gap={4} minHeight={52}>
      <XStack
        testID={`quick-access-option-${entry.key}`}
        flex={1}
        role="checkbox"
        aria-checked={picked}
        aria-disabled={blocked}
        aria-label={entry.label}
        tabIndex={blocked ? undefined : 0}
        onPress={blocked ? undefined : onToggle}
        alignItems="center"
        gap={12}
        paddingVertical={10}
        opacity={blocked ? 0.5 : 1}
        pressStyle={blocked ? undefined : PRESS_STYLE.row}
      >
        <MaterialIcons
          name={picked ? 'check-box' : 'check-box-outline-blank'}
          size={22}
          color={picked ? accent : muted}
        />
        <MaterialIcons name={entry.icon} size={20} color={accent} />
        <Text flex={1} numberOfLines={1} fontSize={15} fontWeight="500" color="$color">
          {entry.label}
        </Text>
      </XStack>
      {picked ? (
        <>
          <MoveButton
            testID={`quick-access-up-${entry.key}`}
            icon="arrow-upward"
            label={t('mweb.sidebar.editorMoveUp', { vars: { label: entry.label } })}
            disabled={index === 0}
            onPress={() => onMove(-1)}
          />
          <MoveButton
            testID={`quick-access-down-${entry.key}`}
            icon="arrow-downward"
            label={t('mweb.sidebar.editorMoveDown', { vars: { label: entry.label } })}
            disabled={index === pickedCount - 1}
            onPress={() => onMove(1)}
          />
        </>
      ) : null}
    </XStack>
  );
}
