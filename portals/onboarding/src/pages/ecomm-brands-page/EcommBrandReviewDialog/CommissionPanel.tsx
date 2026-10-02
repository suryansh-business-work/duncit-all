import { InputAdornment, Paper, Stack, TextField, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  commission: string;
  setCommission: (v: string) => void;
  commissionValid: boolean;
  unchanged: boolean;
  saveCommission: () => void;
  savingCommission: boolean;
  defaultCommissionPct?: number;
}

/** Per-brand product sales commission override. */
export function CommissionPanel({
  commission,
  setCommission,
  commissionValid,
  unchanged,
  saveCommission,
  savingCommission,
  defaultCommissionPct,
}: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
      <Typography variant="subtitle2" sx={{
        fontWeight: 800
      }}>
        {t('onboarding.ecommBrands.productSalesCommission')}
      </Typography>
      <Typography variant="caption" sx={{
        color: "text.secondary"
      }}>
        {t('onboarding.ecommBrands.productSalesCommissionHint', {
          vars: { pct: defaultCommissionPct ?? '—' },
        })}
      </Typography>
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          alignItems: "center",
          mt: 1.5
        }}>
        <TextField
          label={t('onboarding.ecommBrands.productSalesCommission')}
          type="number"
          size="small"
          value={commission}
          onChange={(e) => setCommission(e.target.value)}
          error={!commissionValid}
          helperText={commissionValid ? undefined : t('onboarding.common.commissionRange')}
          fullWidth
          slotProps={{
            input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
            htmlInput: { min: 0, max: 100, step: 1, 'aria-label': 'Product sales commission percentage' }
          }} />
        <DuncitButton
          variant="outlined"
          size="small"
          onClick={saveCommission}
          disabled={savingCommission || !commissionValid || unchanged}
          sx={{ whiteSpace: 'nowrap', mb: 2.5 }}
        >
          {savingCommission ? 'Saving…' : 'Save commission'}
        </DuncitButton>
      </Stack>
    </Paper>
  );
}
