import { useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Stack, Typography } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { HR_SETTINGS_LIMITS as L } from '@duncit/utils';
import { hrSettingsSchema, valuesFromSettings } from './hr-settings.schema';
import type { HrSettingsControl, HrSettingsFormProps, HrSettingsFormValues, HrSettingsOutput } from './hr-settings.types';
import ListEditor from './ListEditor';
import TemplateEditor from './TemplateEditor';

const grid = { display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } };

/**
 * The next automatic code as it will look with the prefix and digits being
 * typed: the server's sequence number (the trailing digits of its preview),
 * re-formatted live.
 */
function useNextCodePreview(control: HrSettingsControl, serverNext: string) {
  const [prefix, digits] = useWatch({ control, name: ['employee_code_prefix', 'employee_code_digits'] });
  const seq = /(\d+)$/.exec(serverNext)?.[1] ?? '1';
  const width = Math.min(L.digitsMax, Math.max(L.digitsMin, Number(digits) || L.digitsMin));
  const head = prefix.trim().toUpperCase();
  return `${head ? `${head}-` : ''}${String(Number(seq)).padStart(width, '0')}`;
}

/** HR > Settings: codes, defaults for new hires, the department and location lists, and the salary template. */
export default function HrSettingsForm({ settings, onSubmit }: Readonly<HrSettingsFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => hrSettingsSchema(t), [t]);
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<HrSettingsFormValues, unknown, HrSettingsOutput>({ resolver: zodResolver(schema), defaultValues: valuesFromSettings(settings) });

  useEffect(() => reset(valuesFromSettings(settings)), [settings, reset]);
  const nextCode = useNextCodePreview(control, settings.next_employee_code);

  return (
    <Stack spacing={3} component="form" noValidate onSubmit={handleSubmit(async (values) => {
        await onSubmit(values);
      })} data-testid="hr-settings-form">
      <SectionCard title={t('hrEmployee.settings.codesTitle')}>
        <Box sx={grid}>
          <RhfTextField
            control={control}
            name="employee_code_prefix"
            label={t('hrEmployee.settings.prefix')}
            hint={t('hrEmployee.settings.prefixHint')}
            slotProps={{ htmlInput: { maxLength: L.prefixMax, 'data-testid': 'hr-settings-prefix' } }}
          />
          <RhfTextField control={control} name="employee_code_digits" label={t('hrEmployee.settings.digits')} type="number" slotProps={{ htmlInput: { min: L.digitsMin, max: L.digitsMax, 'data-testid': 'hr-settings-digits' } }} />
          <Typography variant="body2" sx={{ alignSelf: 'center', color: 'text.secondary' }} data-testid="hr-settings-next-code">
            {t('hrEmployee.settings.nextCode', { vars: { code: nextCode } })}
          </Typography>
        </Box>
      </SectionCard>
      <SectionCard title={t('hrEmployee.settings.defaultsTitle')}>
        <Box sx={grid}>
          <RhfTextField control={control} name="default_currency" label={t('hrEmployee.settings.currency')} slotProps={{ htmlInput: { maxLength: 3, 'data-testid': 'hr-settings-currency' } }} />
          <RhfTextField control={control} name="default_notice_period_days" label={t('hrEmployee.settings.noticeDays')} type="number" slotProps={{ htmlInput: { min: 0, max: L.noticeDaysMax, 'data-testid': 'hr-settings-notice' } }} />
          <RhfTextField control={control} name="default_probation_months" label={t('hrEmployee.settings.probationMonths')} type="number" slotProps={{ htmlInput: { min: 0, max: L.probationMonthsMax, 'data-testid': 'hr-settings-probation' } }} />
        </Box>
      </SectionCard>
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        <ListEditor control={control} name="departments" title={t('hrEmployee.settings.departmentsTitle')} />
        <ListEditor control={control} name="work_locations" title={t('hrEmployee.settings.locationsTitle')} />
      </Box>
      <TemplateEditor control={control} />
      <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
        <DuncitButton type="submit" variant="contained" startIcon={<SaveIcon />} disabled={isSubmitting} data-testid="hr-settings-save">
          {t('hrEmployee.settings.save')}
        </DuncitButton>
      </Stack>
    </Stack>
  );
}
