import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { FieldLabel } from '@/components/Field';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

export interface ChipOption {
  value: string;
  label: string;
  /** Where the option is, shown after the label as "| (pin) place" — only clubs set it. */
  place?: string;
}

interface ChipPlaceProps {
  place: string;
  /** The chip's text token and the matching icon colour — computed once by the chip. */
  ink: '$onPrimary' | '$muted';
  iconColor: string;
  testID: string;
}

/** "| (pin) Gomti Nagar, Lucknow" after a club's name. mWeb twin: steps/ClubOption. */
function ChipPlace({ place, ink, iconColor, testID }: Readonly<ChipPlaceProps>) {
  return (
    <XStack alignItems="center" gap={4} flexShrink={1}>
      <Text fontSize={13} color={ink}>
        |
      </Text>
      <MaterialIcons name="place" size={14} color={iconColor} />
      <Text testID={testID} fontSize={13} color={ink} numberOfLines={1} flexShrink={1}>
        {place}
      </Text>
    </XStack>
  );
}

interface Props {
  label: string;
  options: ChipOption[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  emptyHint?: string;
  /** Guidance shown under the label, before the choices — what this pick means,
   * not what went wrong (that is `error`). */
  hint?: string;
  required?: boolean;
  testID: string;
}

/** A labelled wrap of selectable chips — the screen's picker control for
 * clubs, venues, venue space, mode and pod type. */
export function ChipSelectField({
  label,
  options,
  value,
  onChange,
  error,
  emptyHint,
  hint,
  required,
  testID,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { muted, onPrimary } = useThemeColors();
  return (
    <YStack gap={6}>
      <FieldLabel label={label} required={required} testID={testID} />
      {hint ? (
        <Text testID={`${testID}-hint`} fontSize={12} color="$muted">
          {hint}
        </Text>
      ) : null}
      {options.length === 0 ? (
        <Text testID={`${testID}-empty`} fontSize={13} color="$muted">
          {emptyHint ?? t('mweb.createPod.noOptions')}
        </Text>
      ) : (
        <XStack gap={8} flexWrap="wrap" role="radiogroup" aria-label={label}>
          {options.map((option) => {
            const selected = value === option.value;
            const ariaLabel = option.place
              ? t('mweb.createPod.clubOptionAria', {
                  vars: { club: option.label, place: option.place },
                })
              : option.label;
            return (
              <XStack
                key={option.value}
                testID={`${testID}-${option.value}`}
                tabIndex={0}
                role="radio"
                aria-label={ariaLabel}
                aria-checked={selected}
                onPress={() => onChange(option.value)}
                minHeight={36}
                alignItems="center"
                gap={6}
                paddingHorizontal={14}
                borderRadius={999}
                backgroundColor={selected ? '$primary' : '$soft'}
                pressStyle={PRESS_STYLE.control}
              >
                <Text fontSize={13} fontWeight="600" color={selected ? '$onPrimary' : '$color'}>
                  {option.label}
                </Text>
                {option.place ? (
                  <ChipPlace
                    place={option.place}
                    ink={selected ? '$onPrimary' : '$muted'}
                    iconColor={selected ? onPrimary : muted}
                    testID={`${testID}-${option.value}-place`}
                  />
                ) : null}
              </XStack>
            );
          })}
        </XStack>
      )}
      {error ? (
        <Text role="alert" testID={`${testID}-error`} fontSize={12} color="$danger">
          {error}
        </Text>
      ) : null}
    </YStack>
  );
}
