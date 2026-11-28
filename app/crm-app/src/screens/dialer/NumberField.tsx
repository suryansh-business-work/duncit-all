import { MaterialIcons } from '@expo/vector-icons';
import { Input, XStack, useTheme } from 'tamagui';

import { MOBILE, RADII } from '@/constants/design';
import { useTranslation } from '@/hooks/useTranslation';
import { dialable } from '@/services/dialer';

interface Props {
  number: string;
  onChange: (next: string) => void;
}

/** The field's own height: the large digits plus room, so no glyph is ever clipped. */
const FIELD_HEIGHT = 72;

/**
 * The digits' size: large like a phone's own dialer, a step smaller for a long
 * international number so it still fits on one line, and the placeholder at
 * body size (a 32 pt "Enter a number" was cut off by the field before).
 */
export function digitSize(number: string): number {
  if (!number) return 20;
  return number.length > 12 ? 26 : 32;
}

/**
 * The number being dialled, centred and large as a phone's dialer shows it,
 * with backspace (a long press clears it). It never opens the keyboard: the
 * dial pad types into it, and a pasted or linked number is cleaned to
 * dialable characters. The backspace keeps its space when hidden, so the
 * digits stay centred while typing.
 */
export function NumberField({ number, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const size = digitSize(number);
  return (
    <XStack alignItems="center" height={FIELD_HEIGHT}>
      <XStack width={MOBILE.touch} />
      <Input
        flex={1}
        height={FIELD_HEIGHT}
        value={number}
        onChangeText={(text) => onChange(dialable(text))}
        placeholder={t('crmApp.dialer.placeholder')}
        aria-label={t('crmApp.dialer.placeholder')}
        placeholderTextColor="$muted"
        keyboardType="phone-pad"
        textAlign="center"
        fontSize={size}
        lineHeight={Math.round(size * 1.3)}
        fontWeight={number ? '600' : '400'}
        letterSpacing={number ? 1 : 0}
        paddingVertical={0}
        borderWidth={0}
        backgroundColor="transparent"
        showSoftInputOnFocus={false}
        testID="dialer-number"
      />
      <XStack
        role={number ? 'button' : undefined}
        aria-label={number ? t('crmApp.dialer.backspace') : undefined}
        accessibilityHint={number ? t('crmApp.dialer.clearHint') : undefined}
        aria-hidden={!number}
        onPress={number ? () => onChange(number.slice(0, -1)) : undefined}
        onLongPress={number ? () => onChange('') : undefined}
        width={MOBILE.touch}
        height={MOBILE.touch}
        alignItems="center"
        justifyContent="center"
        borderRadius={RADII.pill}
        opacity={number ? 1 : 0}
        pressStyle={{ backgroundColor: '$soft' }}
        testID={number ? 'dialer-backspace' : undefined}
      >
        <MaterialIcons name="backspace" size={24} color={theme.muted?.val} />
      </XStack>
    </XStack>
  );
}
