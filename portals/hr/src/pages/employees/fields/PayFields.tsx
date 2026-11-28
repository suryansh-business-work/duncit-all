import { useFieldArray, useFormContext, useFormState, useWatch, type FieldValues } from 'react-hook-form';
import { Alert, Box, IconButton, Stack, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton } from '@duncit/buttons';
import { RhfSelect, RhfSwitch, RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import {
  HR_COMPENSATION_REASON_KEYS,
  HR_EMPLOYEE_LIMITS as L,
  HR_PAY_COMPONENT_TYPES,
  HR_PAY_TYPE_KEYS,
  HR_REVISION_REASONS,
  applySalaryTemplate,
  hrOptions,
  hrPayTotals,
  type HrTemplateLine,
} from '@duncit/utils';
import DayField from './DayField';
import PayTotals from './PayTotals';
import { BLANK_PAY_LINE } from './employee-fields.defaults';
import type { PayLineValues } from './employee-fields.types';

interface Props {
  /** The group path ('pay.' or ''). */
  prefix?: string;
  template: readonly HrTemplateLine[];
  /** A hire's revision is always HIRE, so the reason picker is hidden. */
  showReason: boolean;
}

const lineGrid = { display: 'grid', gap: 1, alignItems: 'start', gridTemplateColumns: { xs: '1fr', md: '2fr 1.5fr 1.2fr auto auto' } };

/** Currency, effective date, reason, the pay lines (or a CTC through the salary template) and live totals. */
export default function PayFields({ prefix = '', template, showReason }: Readonly<Props>) {
  const { t } = useTranslation();
  const { control, getValues, setValue, getFieldState } = useFormContext<FieldValues>();
  const n = (field: string) => `${prefix}${field}`;
  const { fields, append, remove } = useFieldArray({ control, name: n('lines') });
  const lines = (useWatch({ control, name: n('lines') }) as PayLineValues[] | undefined) ?? [];
  const currency = (useWatch({ control, name: n('currency') }) as string) || 'INR';
  const formState = useFormState({ control, name: n('lines') });
  const linesError = getFieldState(n('lines'), formState).error;
  const linesMessage = linesError?.root?.message ?? linesError?.message;
  const totals = hrPayTotals(lines.map((line) => ({ type: line.type, monthly_amount: Number(line.monthly_amount) || 0, target_linked: line.target_linked })));

  const applyTemplate = () => {
    const ctc = Number(getValues(n('annual_ctc')));
    const computed = applySalaryTemplate(Number.isFinite(ctc) ? ctc : 0, template);
    setValue(
      n('lines'),
      computed.map((line) => ({ ...line, monthly_amount: String(line.monthly_amount) })),
      { shouldDirty: true, shouldValidate: true }
    );
  };

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: showReason ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)' } }}>
        <RhfTextField control={control} name={n('currency')} label={t('hrEmployee.field.currency')} slotProps={{ htmlInput: { maxLength: 3, 'data-testid': 'hr-pay-currency' } }} />
        <DayField name={n('effective_from')} label={t('hrEmployee.field.effectiveFrom')} hint={t('hrEmployee.hint.effectiveFrom')} required testId="hr-pay-effective" />
        {showReason && <RhfSelect control={control} name={n('reason')} label={t('hrEmployee.field.payReason')} options={hrOptions(HR_REVISION_REASONS, HR_COMPENSATION_REASON_KEYS, t)} />}
      </Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'flex-start' } }}>
        <RhfTextField control={control} name={n('annual_ctc')} label={t('hrEmployee.field.annualCtc')} type="number" slotProps={{ htmlInput: { min: 0, 'data-testid': 'hr-pay-ctc' } }} />
        <DuncitButton startIcon={<AutoFixHighIcon />} onClick={applyTemplate} disabled={template.length === 0} data-testid="hr-pay-apply-template" sx={{ mt: { sm: 1 } }}>
          {t('hrEmployee.pay.applyTemplate')}
        </DuncitButton>
      </Stack>
      {template.length === 0 && <Alert severity="info">{t('hrEmployee.pay.noTemplate')}</Alert>}
      {linesMessage && <Alert severity="error">{linesMessage}</Alert>}
      {fields.map((field, index) => (
        <Box key={field.id} sx={lineGrid}>
          <RhfTextField control={control} name={n(`lines.${index}.label`)} label={t('hrEmployee.field.payLabel')} size="small" slotProps={{ htmlInput: { maxLength: L.componentLabelMax, 'data-testid': `hr-pay-label-${index}` } }} />
          <RhfSelect control={control} name={n(`lines.${index}.type`)} label={t('hrEmployee.field.payType')} size="small" options={hrOptions(HR_PAY_COMPONENT_TYPES, HR_PAY_TYPE_KEYS, t)} />
          <RhfTextField control={control} name={n(`lines.${index}.monthly_amount`)} label={t('hrEmployee.field.payAmount')} size="small" type="number" slotProps={{ htmlInput: { min: 0, step: 'any', 'data-testid': `hr-pay-amount-${index}` } }} />
          <RhfSwitch control={control} name={n(`lines.${index}.target_linked`)} label={t('hrEmployee.field.targetLinked')} hint={t('hrEmployee.hint.targetLinked')} />
          <Tooltip title={t('hrEmployee.pay.removeLine', { vars: { index: index + 1 } })}>
            <span>
              <IconButton onClick={() => remove(index)} disabled={fields.length <= 1} aria-label={t('hrEmployee.pay.removeLine', { vars: { index: index + 1 } })} data-testid={`hr-pay-remove-${index}`}>
                <DeleteOutlineIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      ))}
      <div>
        <DuncitButton startIcon={<AddIcon />} onClick={() => append({ ...BLANK_PAY_LINE })} disabled={fields.length >= L.componentsMax} data-testid="hr-pay-add-line">
          {t('hrEmployee.pay.addLine')}
        </DuncitButton>
      </div>
      <PayTotals totals={totals} currency={currency} />
      <RhfTextField control={control} name={n('note')} label={t('hrEmployee.field.note')} multiline minRows={2} slotProps={{ htmlInput: { maxLength: L.noteMax, 'data-testid': 'hr-pay-note' } }} />
    </Stack>
  );
}
