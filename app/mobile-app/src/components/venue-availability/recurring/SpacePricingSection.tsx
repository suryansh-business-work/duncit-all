import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { FieldLabel } from '@/components/Field';
import { LabeledInput } from '@/components/LabeledInput';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { SpaceRow } from './recurring-form';

interface Props {
  spaces: SpaceRow[];
  onChange: (next: SpaceRow[]) => void;
}

/** Pricing by space — each venue space gets its own price and creates its own
 * slots. A single unnamed row means the whole venue. */
export function SpacePricingSection({ spaces, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const { primary, color } = useThemeColors();
  const setRow = (label: string, p: Partial<SpaceRow>) =>
    onChange(spaces.map((space) => (space.label === label ? { ...space, ...p } : space)));
  // The include toggle only makes sense when there are named spaces to choose from.
  const showToggle = spaces.length > 1 || spaces.some((space) => space.label !== '');
  const spaceName = (space: SpaceRow) => space.label || t('availability.wholeVenue');

  return (
    <YStack gap={8}>
      <FieldLabel label={t('availability.recurring.pricingBySpace')} />
      <Text fontSize={11.5} color="$muted">
        {t('availability.recurring.pricingBySpaceHint')}
      </Text>
      {spaces.map((space) => {
        const name = spaceName(space);
        const rowId = space.label || 'whole-venue';
        return (
          <XStack key={rowId} gap={10} alignItems="center">
            {showToggle ? (
              <XStack
                testID={`recurring-space-${rowId}-include`}
                role="checkbox"
                aria-label={t('availability.recurring.includeSpace', { vars: { space: name } })}
                aria-checked={space.enabled}
                onPress={() => setRow(space.label, { enabled: !space.enabled })}
                pressStyle={PRESS_STYLE.control}
              >
                <MaterialIcons
                  name={space.enabled ? 'check-box' : 'check-box-outline-blank'}
                  size={22}
                  color={space.enabled ? primary : color}
                />
              </XStack>
            ) : null}
            <YStack flex={1}>
              <Text fontSize={13.5} fontWeight="700" color="$color" numberOfLines={1}>
                {name}
              </Text>
              <Text fontSize={11.5} color="$muted">
                {t('availability.recurring.capacity', { vars: { capacity: space.capacity } })}
              </Text>
            </YStack>
            <YStack width={120}>
              <LabeledInput
                testID={`recurring-space-${rowId}-price`}
                label={t('availability.price')}
                value={space.price}
                onChangeText={(price) => setRow(space.label, { price })}
                keyboardType="numeric"
                disabled={!space.enabled}
              />
            </YStack>
          </XStack>
        );
      })}
    </YStack>
  );
}
