import { Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/AddRounded';
import RemoveIcon from '@mui/icons-material/RemoveRounded';
import { DuncitIconButton } from '@duncit/buttons';
import { FOOD_ORDER_LIMITS } from '@duncit/utils';
import { useTranslation } from '../../../i18n/useTranslation';

interface Props {
  /** The dish, for the buttons' names. */
  name: string;
  quantity: number;
  onChange: (quantity: number) => void;
  disabled?: boolean;
  testId: string;
}

const BUTTON_SX = { width: 36, height: 36, minHeight: 36, color: 'primary.main' } as const;

/**
 * − quantity + for one dish. Taking the last one away removes the dish; the +
 * stops at the most of one dish an order may hold. Each button names the dish
 * it changes, and the count is announced as it moves.
 */
export default function QuantityStepper({ name, quantity, onChange, disabled, testId }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack
      direction="row"
      role="group"
      aria-label={t('mweb.venueFood.quantityOf', { vars: { quantity: String(quantity), name } })}
      data-testid={testId}
      sx={{ alignItems: 'center', border: 1, borderColor: 'divider', borderRadius: 999, bgcolor: 'background.paper' }}
    >
      <DuncitIconButton
        aria-label={t('mweb.venueFood.decrease', { vars: { name } })}
        onClick={() => onChange(quantity - 1)}
        disabled={disabled}
        sx={BUTTON_SX}
        data-testid={`${testId}-decrease`}
      >
        <RemoveIcon fontSize="small" />
      </DuncitIconButton>
      <Typography
        aria-live="polite"
        aria-atomic="true"
        data-testid={`${testId}-value`}
        sx={{ minWidth: 24, textAlign: 'center', fontWeight: 700, fontSize: '0.875rem' }}
      >
        {quantity}
      </Typography>
      <DuncitIconButton
        aria-label={t('mweb.venueFood.increase', { vars: { name } })}
        onClick={() => onChange(quantity + 1)}
        disabled={disabled || quantity >= FOOD_ORDER_LIMITS.maxQuantity}
        sx={BUTTON_SX}
        data-testid={`${testId}-increase`}
      >
        <AddIcon fontSize="small" />
      </DuncitIconButton>
    </Stack>
  );
}
