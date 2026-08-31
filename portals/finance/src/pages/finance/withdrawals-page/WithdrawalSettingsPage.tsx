import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useForm , type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import { notifySuccess } from '@duncit/dialogs';
import MinimumAmountField from './MinimumAmountField';
import {
  UPDATE_WITHDRAWAL_MINIMUMS,
  WITHDRAWAL_MINIMUMS,
  type WithdrawalMinimums,
} from './queries';
import { ROLE_LABELS, ROLE_MINIMUM_FIELD, WITHDRAWER_ROLES, type WithdrawerRole } from './roles';
import {
  BLANK_MINIMUMS,
  toFormValues,
  withdrawalMinimumsSchema,
  type WithdrawalMinimumsForm,
} from './withdrawal-minimums.schema';

export default function WithdrawalSettingsPage() {
  const { data, loading } = useQuery<{ withdrawalMinimums: WithdrawalMinimums; publicFinanceSettings: { currency_symbol: string } }>(
    WITHDRAWAL_MINIMUMS,
    { fetchPolicy: 'cache-and-network' },
  );
  const [updateMut, { loading: saving }] = useMutation<any>(UPDATE_WITHDRAWAL_MINIMUMS);
  const [error, setError] = useState<string | null>(null);

  const { control, trigger, getValues, reset, resetField, formState } =
    useForm<WithdrawalMinimumsForm, any, WithdrawalMinimumsForm>({
      resolver: zodResolver(withdrawalMinimumsSchema) as unknown as Resolver<WithdrawalMinimumsForm, any, WithdrawalMinimumsForm>,
      defaultValues: BLANK_MINIMUMS,
      mode: 'onBlur',
    });

  const minimums = data?.withdrawalMinimums;
  // Falls back to empty rather than a hardcoded symbol: a blank adornment is
  // honest while settings load, a wrong currency is not.
  const currency = data?.publicFinanceSettings?.currency_symbol ?? '';
  useEffect(() => {
    if (minimums) reset(toFormValues(minimums));
  }, [minimums, reset]);

  const save = useCallback(
    async (role: WithdrawerRole) => {
      const field = ROLE_MINIMUM_FIELD[role];
      setError(null);
      const valid = await trigger(field);
      if (!valid) return;
      const amount = Number.parseInt(getValues(field), 10);
      try {
        const result = await updateMut({ variables: { input: { [field]: amount } } });
        const saved = result.data?.updateWithdrawalMinimums as WithdrawalMinimums | undefined;
        // Re-seed only this field's default so the OTHER three keep any edit in
        // progress — the mutation never touched them.
        resetField(field, { defaultValue: String(saved?.[field] ?? amount) });
        notifySuccess(`${ROLE_LABELS[role]} minimum saved`);
      } catch (e: any) {
        setError(e.message ?? 'Could not save the minimum withdrawal amount.');
      }
    },
    [trigger, getValues, updateMut, resetField],
  );

  if (loading && !data) {
    return (
      <Box sx={{ p: 6, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          alignItems: "center",
          mb: 3
        }}>
        <TuneIcon color="primary" sx={{ fontSize: 28 }} />
        <Box>
          <Typography variant="h5" sx={{
            fontWeight: 700
          }}>
            Withdrawal Settings
          </Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            The minimum withdrawable balance each partner must reach before they can raise a
            withdrawal.
          </Typography>
        </Box>
      </Stack>

      <Stack spacing={2}>
        <Alert severity="info">
          Each role has its own floor and is saved on its own — changing one leaves the other three
          untouched. The floor is read when a withdrawal is raised and never re-read, so editing a
          value here never re-gates a request that is already pending.
        </Alert>

        {error && <Alert severity="error">{error}</Alert>}

        {WITHDRAWER_ROLES.map((role) => (
          <MinimumAmountField
            key={role}
            role={role}
            currency={currency}
            control={control}
            dirty={!!formState.dirtyFields[ROLE_MINIMUM_FIELD[role]]}
            saving={saving}
            onSave={save}
          />
        ))}
      </Stack>
    </Box>
  );
}
