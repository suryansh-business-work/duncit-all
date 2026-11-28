import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { Box, FormControlLabel, Radio, RadioGroup, Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { HR_EMPLOYEE_LIMITS as L } from '@duncit/utils';
import AccountPickerField from './AccountPickerField';
import type { HireFormValues } from './hire-employee.types';

/** Who is being hired: an existing Duncit account, or a new one opened by email — plus their employee code. */
export default function AccountStep({ nextCode }: Readonly<{ nextCode: string }>) {
  const { t } = useTranslation();
  const { control } = useFormContext<HireFormValues>();
  const mode = useWatch({ control, name: 'account_mode' });

  return (
    <Stack spacing={2}>
      <Controller
        control={control}
        name="account_mode"
        render={({ field }) => (
          <RadioGroup row value={field.value} onChange={(_event, value) => field.onChange(value)} aria-label={t('hrEmployee.hire.step.account')}>
            <FormControlLabel value="EXISTING" control={<Radio />} label={t('hrEmployee.hire.accountExisting')} />
            <FormControlLabel value="NEW" control={<Radio />} label={t('hrEmployee.hire.accountNew')} />
          </RadioGroup>
        )}
      />
      {mode === 'EXISTING' ? (
        <AccountPickerField />
      ) : (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '2fr 96px 1fr' } }}>
          <RhfTextField control={control} name="new_email" label={t('hrEmployee.hire.newEmail')} hint={t('hrEmployee.hire.newEmailHint')} type="email" required slotProps={{ htmlInput: { 'data-testid': 'hr-hire-new-email' } }} />
          <RhfTextField control={control} name="new_phone_extension" label={t('hrEmployee.field.dialCode')} slotProps={{ htmlInput: { maxLength: 5, 'data-testid': 'hr-hire-new-ext' } }} />
          <RhfTextField control={control} name="new_phone_number" label={t('hrEmployee.hire.newPhone')} type="tel" slotProps={{ htmlInput: { maxLength: 15, 'data-testid': 'hr-hire-new-phone' } }} />
        </Box>
      )}
      <RhfTextField
        control={control}
        name="employee_code"
        label={t('hrEmployee.field.employeeCode')}
        hint={t('hrEmployee.hint.employeeCode', { vars: { code: nextCode } })}
        slotProps={{ htmlInput: { maxLength: L.codeMax, 'data-testid': 'hr-hire-code' } }}
      />
    </Stack>
  );
}
