import { Controller, type Control } from 'react-hook-form';
import { Card, CardContent, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { ROLE_HINTS, ROLE_LABELS, ROLE_MINIMUM_FIELD, type WithdrawerRole } from './roles';
import type { WithdrawalMinimumsForm } from './withdrawal-minimums.schema';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  role: WithdrawerRole;
  /** The configured symbol from finance settings — never a literal. */
  currency: string;
  control: Control<WithdrawalMinimumsForm>;
  dirty: boolean;
  saving: boolean;
  onSave: (role: WithdrawerRole) => void;
}

/**
 * One role's floor, saved on its own. The mutation sends only this role's field,
 * so editing Host can never rewrite the other three.
 */
export default function MinimumAmountField({
  role,
  currency,
  control,
  dirty,
  saving,
  onSave,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const field = ROLE_MINIMUM_FIELD[role];
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle1" sx={{
          fontWeight: 700
        }}>
          {ROLE_LABELS[role]}
        </Typography>
        <Typography variant="caption" sx={{
          color: "text.secondary"
        }}>
          {ROLE_HINTS[role]}
        </Typography>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{
            alignItems: "flex-start",
            mt: 2
          }}>
          <Controller
            name={field}
            control={control}
            render={({ field: input, fieldState }) => (
              <TextField
                {...input}
                label={t('finance.withdrawals.minimumWithdrawalAmount')}
                required
                size="small"
                inputMode="numeric"
                sx={{ maxWidth: 280, width: '100%' }}
                error={!!fieldState.error}
                helperText={
                  fieldState.error?.message ??
                  `A ${ROLE_LABELS[role]} can only raise a withdrawal once their withdrawable balance reaches this.`
                }
                slotProps={{
                  input: { startAdornment: <InputAdornment position="start">{currency}</InputAdornment> }
                }}
              />
            )}
          />
          <DuncitButton
            variant="contained"
            disabled={!dirty || saving}
            onClick={() => onSave(role)}
            sx={{ mt: { xs: 0, sm: 0.25 } }}
          >
            Save
          </DuncitButton>
        </Stack>
      </CardContent>
    </Card>
  );
}
