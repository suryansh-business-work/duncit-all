import { Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  /** The line's display name — read out on the +/− buttons. */
  name: string;
  value: number;
  max: number;
  onChange: (qty: number) => void;
  testId: string;
}

/** How many of one order line go back: − qty of max +, bounded to 0..max.
 * Native twin: components/orders-history/ReturnQtyStepper (rule 27). */
export default function ReturnQtyStepper({ name, value, max, onChange, testId }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack direction="row" spacing={0.5} data-testid={testId} sx={{ alignItems: 'center' }}>
      <DuncitIconButton
        size="small"
        data-testid={`${testId}-minus`}
        aria-label={t('mweb.podShopReturns.decreaseQty', { vars: { name } })}
        disabled={value <= 0}
        onClick={() => onChange(Math.max(0, value - 1))}
      >
        <RemoveIcon fontSize="small" />
      </DuncitIconButton>
      <Typography
        variant="body2"
        aria-live="polite"
        data-testid={`${testId}-value`}
        sx={{ px: 1, textAlign: 'center', fontWeight: 600 }}
      >
        {t('mweb.podShopReturns.qtyOf', { vars: { qty: String(value), max: String(max) } })}
      </Typography>
      <DuncitIconButton
        size="small"
        data-testid={`${testId}-plus`}
        aria-label={t('mweb.podShopReturns.increaseQty', { vars: { name } })}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <AddIcon fontSize="small" />
      </DuncitIconButton>
    </Stack>
  );
}
