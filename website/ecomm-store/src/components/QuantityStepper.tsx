import { Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { DuncitIconButton } from '@duncit/buttons';

import { useStoreT } from '../i18n';

interface QuantityStepperProps {
  value: number;
  min?: number;
  max: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  /** Names the product, so each stepper on a page is told apart by a screen reader. */
  itemName: string;
}

export function QuantityStepper({ value, min = 1, max, onChange, disabled, itemName }: Readonly<QuantityStepperProps>) {
  const { t } = useStoreT();
  const vars = { name: itemName };
  return (
    <Stack
      direction="row"
     
      role="group"
      aria-label={t('ecommStore.qty.group', { vars })}
      sx={{ alignItems: 'center', border: 1, borderColor: 'divider', borderRadius: 2, width: 'fit-content' }}
    >
      <DuncitIconButton
        aria-label={t('ecommStore.qty.decrease', { vars })}
        disabled={disabled || value <= min}
        onClick={() => onChange(value - 1)}
        sx={{ width: 44, height: 44 }}
      >
        <RemoveIcon fontSize="small" />
      </DuncitIconButton>
      <Typography component="output" aria-live="polite" sx={{ minWidth: 32, textAlign: 'center', fontWeight: 700 }}>
        {value}
      </Typography>
      <DuncitIconButton
        aria-label={t('ecommStore.qty.increase', { vars })}
        disabled={disabled || value >= max}
        onClick={() => onChange(value + 1)}
        sx={{ width: 44, height: 44 }}
      >
        <AddIcon fontSize="small" />
      </DuncitIconButton>
    </Stack>
  );
}
