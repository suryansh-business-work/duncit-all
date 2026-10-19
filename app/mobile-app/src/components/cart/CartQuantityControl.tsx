import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack } from 'tamagui';
import { DISABLED_OPACITY, PRESS_STYLE, TOUCH_TARGET } from '@duncit/buttons-native';
import { cartControlState, stepCartQuantity, type CartControlLabels } from '@duncit/utils';

import { useThemeColors } from '@/hooks/useThemeColors';

export type CartControlSize = 'sm' | 'md';

/** The control's test ids — a call site overrides the ones its suites already use. */
export interface CartControlTestIds {
  root: string;
  add: string;
  decrease: string;
  increase: string;
  count: string;
}

interface Props {
  quantity: number;
  /** The most that can be bought — the plus stops there. */
  max: number;
  labels: CartControlLabels;
  /** The next quantity, already held inside `0..max`; 0 takes the product out. */
  onChange: (next: number) => void;
  disabled?: boolean;
  /** A change is on its way (a lookup, a save): shown as a spinner, and inert. */
  busy?: boolean;
  size?: CartControlSize;
  testIdPrefix?: string;
  testIds?: Partial<CartControlTestIds>;
}

const DIAMETER: Record<CartControlSize, number> = { sm: 32, md: 36 };
const ICON_SIZE: Record<CartControlSize, number> = { sm: 18, md: 20 };

/** An inert part still takes the tap, so it never falls through to a pressable card underneath. */
const swallowPress = () => undefined;

interface PartProps {
  testID: string;
  icon: ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  inert: boolean;
  busy: boolean;
  /** The lone "+" is a filled disc; the pill's buttons are bare. */
  filled: boolean;
  size: CartControlSize;
  onPress: () => void;
}

/** One round press target; smaller than 44pt to the eye, 44pt to the finger. */
function ControlButton({
  testID,
  icon,
  label,
  inert,
  busy,
  filled,
  size,
  onPress,
}: Readonly<PartProps>) {
  const { color: ink, muted, onPrimary } = useThemeColors();
  const diameter = DIAMETER[size];
  const idle = inert ? muted : ink;
  return (
    <XStack
      testID={testID}
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-disabled={inert}
      aria-busy={busy}
      hitSlop={(TOUCH_TARGET - diameter) / 2}
      onPress={inert ? swallowPress : onPress}
      width={diameter}
      height={diameter}
      borderRadius={999}
      alignItems="center"
      justifyContent="center"
      backgroundColor={filled ? '$primary' : 'transparent'}
      opacity={inert && !busy ? DISABLED_OPACITY : 1}
      pressStyle={inert ? undefined : PRESS_STYLE.control}
    >
      {busy ? (
        <Spinner testID={`${testID}-busy`} size="small" color={filled ? '$onPrimary' : '$color'} />
      ) : (
        <MaterialIcons name={icon} size={ICON_SIZE[size]} color={filled ? onPrimary : idle} />
      )}
    </XStack>
  );
}

/**
 * THE add-to-cart control, on every product, cart line and dish: a round "+"
 * until the product is in the cart, then a pill in the same spot — remove
 * (a bin at one, a minus from two up), the count, and a plus that stops at the
 * stock. What it shows and where a step lands come from `@duncit/utils`
 * (`cartControlState`, `stepCartQuantity`), the same derivation mWeb draws with
 * MUI; nothing is decided here. Tamagui twin of `@duncit/ui`'s cart control.
 */
export function CartQuantityControl({
  quantity,
  max,
  labels,
  onChange,
  disabled = false,
  busy = false,
  size = 'md',
  testIdPrefix = 'cart-control',
  testIds,
}: Readonly<Props>) {
  const state = cartControlState(quantity, max);
  const inert = disabled || busy;
  const ids: CartControlTestIds = {
    root: testIdPrefix,
    add: `${testIdPrefix}-add`,
    decrease: `${testIdPrefix}-decrease`,
    increase: `${testIdPrefix}-increase`,
    count: `${testIdPrefix}-count`,
    ...testIds,
  };
  const step = (delta: 1 | -1) => onChange(stepCartQuantity(quantity, delta, max));

  if (state.mode === 'add') {
    return (
      <ControlButton
        testID={ids.add}
        icon="add"
        label={labels.add}
        inert={inert || !state.canIncrease}
        busy={busy}
        filled
        size={size}
        onPress={() => step(1)}
      />
    );
  }
  const removes = state.decrease === 'remove';
  return (
    <XStack
      testID={ids.root}
      role="group"
      aria-label={labels.quantity}
      onPress={swallowPress}
      alignItems="center"
      alignSelf="flex-start"
      borderRadius={999}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      <ControlButton
        testID={ids.decrease}
        icon={removes ? 'delete-outline' : 'remove'}
        label={removes ? labels.remove : labels.decrease}
        inert={inert}
        busy={false}
        filled={false}
        size={size}
        onPress={() => step(-1)}
      />
      <Text
        testID={ids.count}
        aria-live="polite"
        minWidth={24}
        textAlign="center"
        fontSize={14}
        fontWeight="700"
        color="$color"
      >
        {quantity}
      </Text>
      <ControlButton
        testID={ids.increase}
        icon="add"
        label={labels.increase}
        inert={inert || !state.canIncrease}
        busy={busy}
        filled={false}
        size={size}
        onPress={() => step(1)}
      />
    </XStack>
  );
}
