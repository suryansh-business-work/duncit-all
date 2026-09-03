import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { FieldLabel } from '@/components/Field';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { ConflictMode } from './recurring-form';

interface OptionProps {
  mode: ConflictMode;
  title: string;
  hint: string;
  selected: boolean;
  tint: string;
  onPress: (mode: ConflictMode) => void;
}

/** One radio row — the choice and what it does, together. */
function ConflictOption({ mode, title, hint, selected, tint, onPress }: Readonly<OptionProps>) {
  return (
    <XStack
      testID={`recurring-conflict-${mode}`}
      role="radio"
      aria-label={title}
      aria-checked={selected}
      onPress={() => onPress(mode)}
      alignItems="flex-start"
      gap={10}
      pressStyle={PRESS_STYLE.control}
    >
      <MaterialIcons
        name={selected ? 'radio-button-checked' : 'radio-button-unchecked'}
        size={22}
        color={tint}
      />
      <YStack flex={1}>
        <Text fontSize={13.5} fontWeight="700" color="$color">
          {title}
        </Text>
        <Text fontSize={11.5} color="$muted">
          {hint}
        </Text>
      </YStack>
    </XStack>
  );
}

interface Props {
  value: ConflictMode;
  onChange: (mode: ConflictMode) => void;
}

/**
 * What a recurring run does when one of its slots lands on a time the space is
 * already published for. Overwrite is destructive and irreversible, so it says
 * exactly what it deletes at the moment it is picked rather than after.
 */
export function ConflictModeSection({ value, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const { primary, danger, color } = useThemeColors();
  return (
    <YStack gap={8}>
      <FieldLabel label={t('availability.recurring.whenSlotsOverlap')} />
      <ConflictOption
        mode="SKIP"
        title={t('availability.recurring.overlapSkip')}
        hint={t('availability.recurring.overlapSkipHint')}
        selected={value === 'SKIP'}
        tint={value === 'SKIP' ? primary : color}
        onPress={onChange}
      />
      <ConflictOption
        mode="REPLACE"
        title={t('availability.recurring.overlapReplace')}
        hint={t('availability.recurring.overlapReplaceHint')}
        selected={value === 'REPLACE'}
        tint={value === 'REPLACE' ? danger : color}
        onPress={onChange}
      />
      {value === 'REPLACE' ? (
        <Text testID="recurring-conflict-warning" fontSize={12} color="$danger">
          {t('availability.recurring.overlapReplaceWarning')}
        </Text>
      ) : null}
    </YStack>
  );
}
