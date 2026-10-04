import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE, TOUCH_TARGET } from '@duncit/buttons-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { RETURN_REASONS } from '@duncit/utils';

interface Props {
  /** The picked reason's id; blank before a choice. */
  value: string;
  onChange: (id: string) => void;
  error?: string;
}

/** "Why are you returning it?" — one radio per reason. mWeb twin: the
 * RadioGroup in forms/pod-shop-return (rule 27). */
export function ReturnReasonList({ value, onChange, error }: Readonly<Props>) {
  const { t } = useTranslation();
  const { color, primary } = useThemeColors();
  const label = t('mweb.podShopReturns.reasonLabel');

  return (
    <YStack testID="pod-shop-return-reasons" role="radiogroup" aria-label={label}>
      <Text fontSize={12} fontWeight="600" color="$muted">
        {label}
      </Text>
      {RETURN_REASONS.map((reason) => {
        const checked = value === reason.id;
        const text = t(reason.key);
        return (
          <XStack
            key={reason.id}
            testID={`pod-shop-return-reason-${reason.id}`}
            role="radio"
            aria-checked={checked}
            aria-label={text}
            tabIndex={0}
            onPress={() => onChange(reason.id)}
            alignItems="center"
            gap={10}
            minHeight={TOUCH_TARGET}
            paddingVertical={8}
            pressStyle={PRESS_STYLE.row}
          >
            <MaterialIcons
              name={checked ? 'radio-button-checked' : 'radio-button-unchecked'}
              size={20}
              color={checked ? primary : color}
            />
            <Text flex={1} fontSize={14} color="$color">
              {text}
            </Text>
          </XStack>
        );
      })}
      {error ? (
        <Text role="alert" fontSize={12} color="$danger">
          {error}
        </Text>
      ) : null}
    </YStack>
  );
}
