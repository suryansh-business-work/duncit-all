import { useMemo, useState } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Stack, Step, StepLabel, Stepper } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import { DuncitButton } from '@duncit/buttons';
import { RhfSwitch } from '@duncit/forms';
import { fireAndForget, logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import PersonalFields from '../../fields/PersonalFields';
import JobFields from '../../fields/JobFields';
import PayFields from '../../fields/PayFields';
import BankFields from '../../fields/BankFields';
import AccountStep from './AccountStep';
import ReviewStep from './ReviewStep';
import { STEP_FIELDS, hireSchema, initialHireValues } from './hire-employee.schema';
import { HIRE_STEPS, type HireFormProps, type HireFormValues, type HireOutput } from './hire-employee.types';

// Every step label written out, so the translation gate sees each key.
const STEP_KEYS = {
  account: 'hrEmployee.hire.step.account',
  personal: 'hrEmployee.hire.step.personal',
  job: 'hrEmployee.hire.step.job',
  pay: 'hrEmployee.hire.step.pay',
  bank: 'hrEmployee.hire.step.bank',
  review: 'hrEmployee.hire.step.review',
} as const;

/**
 * Hire, as a business process in steps: account, personal, job, pay, bank and
 * review. Each step is checked before Next moves on, so a problem is shown on
 * the step that has it; the server re-checks the whole hire on submit.
 */
export default function HireEmployeeForm({ settings, preset, onSubmit, onCancel }: Readonly<HireFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => hireSchema(t), [t]);
  const methods = useForm<HireFormValues, unknown, HireOutput>({ resolver: zodResolver(schema), defaultValues: initialHireValues(settings, preset), mode: 'onTouched' });
  const { control, handleSubmit, trigger, getValues, setValue, formState } = methods;
  const [active, setActive] = useState(0);
  const step = HIRE_STEPS[active];
  const includePay = useWatch({ control, name: 'include_pay' });
  const isLast = active === HIRE_STEPS.length - 1;

  const next = async () => {
    if (!(await trigger(STEP_FIELDS[step], { shouldFocus: true }))) return;
    // Pay starts on the joining date unless HR picks another day.
    if (step === 'job' && !getValues('pay.effective_from')) setValue('pay.effective_from', getValues('job.date_of_joining'));
    setActive((index) => Math.min(index + 1, HIRE_STEPS.length - 1));
  };

  return (
    <FormProvider {...methods}>
      <Stack spacing={3} component="form" noValidate onSubmit={handleSubmit(async (values) => {
        await onSubmit(values);
      })} data-testid="hr-hire-form">
        <Stepper activeStep={active} alternativeLabel>
          {HIRE_STEPS.map((key) => (
            <Step key={key}>
              <StepLabel>{t(STEP_KEYS[key])}</StepLabel>
            </Step>
          ))}
        </Stepper>
        {step === 'account' && <AccountStep nextCode={settings.next_employee_code} />}
        {step === 'personal' && <PersonalFields prefix="personal." />}
        {step === 'job' && <JobFields prefix="job." settings={settings} employeeId={null} suggestProbation />}
        {step === 'pay' && (
          <Stack spacing={2}>
            <RhfSwitch control={control} name="include_pay" label={t('hrEmployee.hire.addPay')} hint={t('hrEmployee.hire.payOptional')} />
            {includePay && <PayFields prefix="pay." template={settings.salary_template} showReason={false} />}
          </Stack>
        )}
        {step === 'bank' && (
          <Stack spacing={2}>
            <Alert severity="info">{t('hrEmployee.hire.bankOptional')}</Alert>
            <BankFields prefix="bank." />
          </Stack>
        )}
        {step === 'review' && <ReviewStep nextCode={settings.next_employee_code} />}
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
          <DuncitButton onClick={active === 0 ? onCancel : () => setActive(active - 1)} startIcon={<ArrowBackIcon />} disabled={formState.isSubmitting} data-testid="hr-hire-back">
            {active === 0 ? t('shell.common.cancel') : t('hrEmployee.hire.back')}
          </DuncitButton>
          {isLast ? (
            <DuncitButton type="submit" variant="contained" startIcon={<HowToRegIcon />} disabled={formState.isSubmitting} data-testid="hr-hire-submit">
              {t('hrEmployee.hire.submit')}
            </DuncitButton>
          ) : (
            <DuncitButton variant="contained" endIcon={<ArrowForwardIcon />} onClick={() => fireAndForget(next(), logs.portal.hr, 'HireEmployeeForm', 'next')} data-testid="hr-hire-next">
              {t('hrEmployee.hire.next')}
            </DuncitButton>
          )}
        </Stack>
      </Stack>
    </FormProvider>
  );
}
