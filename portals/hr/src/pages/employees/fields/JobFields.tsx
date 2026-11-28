import { useEffect, useRef } from 'react';
import { useFormContext, useWatch, type FieldValues } from 'react-hook-form';
import { Box } from '@mui/material';
import { RhfSelect, RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { HR_EMPLOYEE_LIMITS as L, HR_EMPLOYMENT_TYPES, HR_EMPLOYMENT_TYPE_KEYS, hrOptions, type HrSettingsRecord } from '@duncit/utils';
import DayField from './DayField';
import ManagerPickerField from './ManagerPickerField';
import SuggestField from './SuggestField';
import { suggestedProbationEnd } from './employee-fields.defaults';

interface Props {
  /** The group path ('job.' or ''). */
  prefix?: string;
  settings: HrSettingsRecord | null;
  /** The record being edited, never offered as its own manager. */
  employeeId: string | null;
  /** Fill the probation end from HR settings when the joining date changes and it is still empty. */
  suggestProbation?: boolean;
}

const grid = { display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } };

/** Title, department, location, manager, employment type, dates, notice period and work email. */
export default function JobFields({ prefix = '', settings, employeeId, suggestProbation = false }: Readonly<Props>) {
  const { t } = useTranslation();
  const { control, getValues, setValue } = useFormContext<FieldValues>();
  const n = (field: string) => `${prefix}${field}`;
  const joining = useWatch({ control, name: n('date_of_joining') }) as string;
  const lastJoining = useRef(joining);

  useEffect(() => {
    if (!suggestProbation || joining === lastJoining.current) return;
    lastJoining.current = joining;
    const probation = `${prefix}probation_end_date`;
    if (getValues(probation)) return;
    const suggestion = suggestedProbationEnd(joining, settings?.default_probation_months ?? 0);
    if (suggestion) setValue(probation, suggestion, { shouldDirty: true });
  }, [joining, prefix, suggestProbation, settings, getValues, setValue]);

  return (
    <Box sx={grid}>
      <RhfTextField control={control} name={n('job_title')} label={t('hrEmployee.field.jobTitle')} required slotProps={{ htmlInput: { maxLength: L.titleMax, 'data-testid': 'hr-job-title' } }} />
      <RhfSelect control={control} name={n('employment_type')} label={t('hrEmployee.field.employmentType')} required options={hrOptions(HR_EMPLOYMENT_TYPES, HR_EMPLOYMENT_TYPE_KEYS, t)} />
      <SuggestField name={n('department')} label={t('hrEmployee.field.department')} options={settings?.departments ?? []} maxLength={L.departmentMax} testId="hr-department" />
      <SuggestField name={n('work_location')} label={t('hrEmployee.field.workLocation')} options={settings?.work_locations ?? []} maxLength={L.locationMax} testId="hr-location" />
      <ManagerPickerField name={n('manager')} excludeId={employeeId} />
      <RhfTextField control={control} name={n('work_email')} label={t('hrEmployee.field.workEmail')} type="email" slotProps={{ htmlInput: { 'data-testid': 'hr-work-email' } }} />
      <DayField name={n('date_of_joining')} label={t('hrEmployee.field.dateOfJoining')} required testId="hr-joining" />
      <DayField name={n('probation_end_date')} label={t('hrEmployee.field.probationEnd')} testId="hr-probation" />
      <RhfTextField
        control={control}
        name={n('notice_period_days')}
        label={t('hrEmployee.field.noticeDays')}
        hint={t('hrEmployee.hint.noticeDays')}
        type="number"
        slotProps={{ htmlInput: { min: 0, max: L.noticeDaysMax, 'data-testid': 'hr-notice' } }}
      />
    </Box>
  );
}
