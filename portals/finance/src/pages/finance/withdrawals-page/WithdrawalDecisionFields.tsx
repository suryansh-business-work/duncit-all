import { Controller, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form';
import {
  Alert,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  InputAdornment,
  Radio,
  RadioGroup,
  Stack,
  TextField,
} from '@mui/material';
import { formatMoney } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import type { DecisionFormValues } from './withdrawal-decision.schema';

interface Props {
  control: Control<DecisionFormValues>;
  register: UseFormRegister<DecisionFormValues>;
  errors: FieldErrors<DecisionFormValues>;
  decision: DecisionFormValues['decision'];
  requested: number;
  currencySymbol: string;
  accountVerified: boolean;
  /** Money cannot go out at all, so approving is not offered. */
  payoutsConfigured: boolean;
}

/**
 * The three actions Finance chooses between, and the one or two inputs each
 * needs: Accept needs none, Partially approve needs the amount and a reason,
 * Reject needs a reason. The reason is what the withdrawer reads, so the helper
 * text says so.
 */
export default function WithdrawalDecisionFields({
  control,
  register,
  errors,
  decision,
  requested,
  currencySymbol,
  accountVerified,
  payoutsConfigured,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const paying = decision !== 'REJECT';
  return (
    <Stack spacing={2}>
      <FormControl>
        <FormLabel id="withdrawal-decision-label">{t('finance.payouts.decision')}</FormLabel>
        <Controller
          name="decision"
          control={control}
          render={({ field }) => (
            <RadioGroup {...field} aria-labelledby="withdrawal-decision-label">
              <FormControlLabel
                value="APPROVE"
                control={<Radio />}
                disabled={!payoutsConfigured}
                label={t('finance.payouts.decisionApprove')}
              />
              <FormControlLabel
                value="PARTIAL"
                control={<Radio />}
                disabled={!payoutsConfigured}
                label={t('finance.payouts.decisionPartial')}
              />
              <FormControlLabel value="REJECT" control={<Radio />} label={t('finance.payouts.decisionReject')} />
            </RadioGroup>
          )}
        />
      </FormControl>

      {decision === 'PARTIAL' ? (
        <TextField
          label={t('finance.payouts.approvedAmount')}
          type="number"
          required
          fullWidth
          error={!!errors.approved_amount}
          helperText={
            errors.approved_amount?.message ??
            t('finance.payouts.approvedAmountHelp', { vars: { requested: formatMoney(requested, { decimals: 2 }) } })
          }
          slotProps={{
            input: { startAdornment: <InputAdornment position="start">{currencySymbol}</InputAdornment> },
            htmlInput: { min: 1, step: '0.01', inputMode: 'decimal' },
          }}
          {...register('approved_amount')}
        />
      ) : null}

      {decision === 'APPROVE' ? null : (
        <TextField
          label={t('finance.common.reason')}
          required
          multiline
          minRows={2}
          fullWidth
          error={!!errors.reason}
          helperText={errors.reason?.message ?? t('finance.payouts.reasonHelp')}
          {...register('reason')}
        />
      )}

      {paying && payoutsConfigured && !accountVerified ? (
        <Stack spacing={0.5}>
          <Alert severity="warning">{t('finance.payouts.unverifiedWarning')}</Alert>
          <FormControl error={!!errors.acknowledge_unverified_account}>
            <FormControlLabel
              control={<Controller name="acknowledge_unverified_account" control={control} render={({ field }) => (
                <Checkbox checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
              )} />}
              label={t('finance.payouts.acknowledgeUnverified')}
            />
            {errors.acknowledge_unverified_account ? (
              <FormHelperText>{errors.acknowledge_unverified_account.message}</FormHelperText>
            ) : null}
          </FormControl>
        </Stack>
      ) : null}
    </Stack>
  );
}
