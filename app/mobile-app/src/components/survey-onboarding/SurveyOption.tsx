import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  testID: string;
  label: string;
  selected: boolean;
  /** Multi-select questions draw a tick box; single-select ones a radio. */
  multi: boolean;
  onPress: () => void;
}

/**
 * One MCQ answer: a real checkbox / radio glyph (never a UTF "●"), the option
 * in ink, green once chosen — the same two controls mWeb's
 * SurveyQuestionField renders with MUI.
 */
export function SurveyOption({ testID, label, selected, multi, onPress }: Readonly<Props>) {
  const { primary, muted } = useThemeColors();
  const onIcon = multi ? 'check-box' : 'radio-button-checked';
  const offIcon = multi ? 'check-box-outline-blank' : 'radio-button-unchecked';

  return (
    <XStack
      testID={testID}
      role={multi ? 'checkbox' : 'radio'}
      aria-checked={selected}
      aria-label={label}
      onPress={onPress}
      minHeight={44}
      alignItems="center"
      gap={10}
      pressStyle={PRESS_STYLE.row}
    >
      <MaterialIcons
        name={selected ? onIcon : offIcon}
        size={22}
        color={selected ? primary : muted}
      />
      <Text flex={1} fontSize={14} color="$color">
        {label}
      </Text>
    </XStack>
  );
}
