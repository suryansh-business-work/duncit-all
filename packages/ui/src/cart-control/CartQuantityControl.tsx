import { useEffect, useRef, type MouseEvent } from 'react';
import { Box, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import RemoveIcon from '@mui/icons-material/Remove';
import { DuncitRoundButton } from '@duncit/buttons';
import { cartControlState, stepCartQuantity, type CartControlLabels } from '@duncit/utils';
import { mergeSx } from '../mergeSx';
import { buttonSx, countSx, shellSx, type CartControlSize } from './styles';

export interface CartQuantityControlProps {
  /** How many of the product are in the cart; `0` shows the lone "+". */
  quantity: number;
  /** The most that can be bought — the stock. `0` leaves even the "+" off. */
  max: number;
  /** The surface's translated copy. The control ships none of its own. */
  labels: CartControlLabels;
  /** The quantity one step away, already held inside `0..max`. `0` means remove. */
  onChange: (next: number) => void;
  /** Nothing can be changed (the product is paused, the cart is locked). */
  disabled?: boolean;
  /** A change is in flight: taps are ignored, nothing moves and focus stays put. */
  busy?: boolean;
  size?: CartControlSize;
  /** Yields `${prefix}-add`, `-dec`, `-qty` and `-inc`. No ids without it. */
  testIdPrefix?: string;
  sx?: SxProps<Theme>;
}

/** A tap anywhere on the control is the control's: the card or link around it must not open. */
function keepInside(event: MouseEvent) {
  event.stopPropagation();
  event.preventDefault();
}

/**
 * The one "add to cart" control on a product card, in mWeb and the store.
 *
 * A round "+" until the product is in the cart; then the same spot holds a pill
 * — a bin while one unit is there, a minus from two up, the count, and a "+"
 * that stops at the stock. Which of those it shows is `cartControlState`'s
 * decision, not this component's, so the Tamagui twin in the native app cannot
 * disagree with it (rules 29 + 56).
 *
 * The "+" is one element in both modes, which is what keeps a keyboard's focus
 * on it when the pill opens. Taking the last unit away removes the button that
 * was pressed, so focus is handed back to the "+" instead of being dropped.
 */
export function CartQuantityControl({
  quantity,
  max,
  labels,
  onChange,
  disabled = false,
  busy = false,
  size = 'medium',
  testIdPrefix,
  sx,
}: Readonly<CartQuantityControlProps>) {
  const { mode, decrease, canIncrease } = cartControlState(quantity, max);
  const stepper = mode === 'stepper';
  const removing = decrease === 'remove';
  const plusRef = useRef<HTMLButtonElement>(null);
  const refocus = useRef(false);

  useEffect(() => {
    // Only when focus was really dropped: a shopper who has moved on keeps their place.
    if (!stepper && refocus.current && document.activeElement === document.body) {
      plusRef.current?.focus();
    }
    refocus.current = false;
  }, [stepper]);

  const step = (delta: 1 | -1) => {
    if (busy) return;
    refocus.current = delta === -1 && removing;
    onChange(stepCartQuantity(quantity, delta, max));
  };
  const testId = (part: string) => (testIdPrefix ? `${testIdPrefix}-${part}` : undefined);
  // `aria-disabled`, not `disabled`: a disabled button drops the focus it holds,
  // and a keyboard would lose its place on every single step.
  const waiting = busy || undefined;

  return (
    // `presentation`: the shell is not a control, it only catches what its buttons let bubble.
    <Box role="presentation" onClick={keepInside} sx={mergeSx(shellSx(size, stepper), sx)}>
      {stepper && (
        <DuncitRoundButton
          aria-label={removing ? labels.remove : labels.decrease}
          aria-disabled={waiting}
          disabled={disabled}
          onClick={() => step(-1)}
          data-testid={testId('dec')}
          sx={buttonSx(size, false)}
        >
          {removing ? <DeleteOutlinedIcon /> : <RemoveIcon />}
        </DuncitRoundButton>
      )}
      {stepper && (
        <Typography
          component="span"
          variant="body2"
          role="status"
          aria-live="polite"
          aria-label={labels.quantity}
          data-testid={testId('qty')}
          sx={countSx(size)}
        >
          {quantity}
        </Typography>
      )}
      <DuncitRoundButton
        ref={plusRef}
        aria-label={stepper ? labels.increase : labels.add}
        aria-disabled={waiting}
        disabled={disabled || !canIncrease}
        onClick={() => step(1)}
        data-testid={testId(stepper ? 'inc' : 'add')}
        sx={buttonSx(size, !stepper)}
      >
        <AddIcon />
      </DuncitRoundButton>
    </Box>
  );
}
