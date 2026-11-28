import { useFieldArray, useFormState } from 'react-hook-form';
import { Alert, Box, IconButton, Stack, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton } from '@duncit/buttons';
import { RhfSelect, RhfSwitch, RhfTextField } from '@duncit/forms';
import { SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import {
  HR_PAY_COMPONENT_TYPES,
  HR_PAY_TYPE_KEYS,
  HR_SETTINGS_LIMITS as L,
  HR_TEMPLATE_CALCS,
  HR_TEMPLATE_CALC_KEYS,
  hrOptions,
} from '@duncit/utils';
import type { HrSettingsControl } from './hr-settings.types';

const BLANK = { label: '', type: 'EARNING', calc: 'FIXED', value: '', target_linked: false } as const;

/** The salary template: how an annual CTC is split into monthly pay lines. The first line is the basic. */
export default function TemplateEditor({ control }: Readonly<{ control: HrSettingsControl }>) {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({ control, name: 'salary_template' });
  const { errors } = useFormState({ control, name: 'salary_template' });
  const listError = errors.salary_template?.root?.message ?? errors.salary_template?.message;
  const types = hrOptions(HR_PAY_COMPONENT_TYPES, HR_PAY_TYPE_KEYS, t);
  const calcs = hrOptions(HR_TEMPLATE_CALCS, HR_TEMPLATE_CALC_KEYS, t);

  return (
    <SectionCard title={t('hrEmployee.settings.templateTitle')} subtitle={t('hrEmployee.settings.templateHint')}>
      <Stack spacing={2}>
        {listError && <Alert severity="error">{listError}</Alert>}
        {fields.map((field, index) => (
          <Box
            key={field.id}
            sx={{ display: 'grid', gap: 1, alignItems: 'start', gridTemplateColumns: { xs: '1fr', md: '2fr 1.4fr 1.6fr 1fr auto auto' } }}
          >
            <RhfTextField
              control={control}
              name={`salary_template.${index}.label`}
              label={t('hrEmployee.settings.templateLabel')}
              size="small"
              slotProps={{ htmlInput: { maxLength: L.templateLabelMax, 'data-testid': `hr-template-label-${index}` } }}
            />
            <RhfSelect control={control} name={`salary_template.${index}.type`} label={t('hrEmployee.settings.templateType')} size="small" options={types} />
            <RhfSelect control={control} name={`salary_template.${index}.calc`} label={t('hrEmployee.settings.templateCalc')} size="small" options={calcs} />
            <RhfTextField
              control={control}
              name={`salary_template.${index}.value`}
              label={t('hrEmployee.settings.templateValue')}
              size="small"
              type="number"
              slotProps={{ htmlInput: { min: 0, step: 'any', 'data-testid': `hr-template-value-${index}` } }}
            />
            <RhfSwitch control={control} name={`salary_template.${index}.target_linked`} label={t('hrEmployee.field.targetLinked')} />
            <Tooltip title={t('hrEmployee.settings.removeTemplateLine', { vars: { index: index + 1 } })}>
              <IconButton
                onClick={() => remove(index)}
                aria-label={t('hrEmployee.settings.removeTemplateLine', { vars: { index: index + 1 } })}
                data-testid={`hr-template-remove-${index}`}
              >
                <DeleteOutlineIcon />
              </IconButton>
            </Tooltip>
          </Box>
        ))}
        <div>
          <DuncitButton startIcon={<AddIcon />} onClick={() => append({ ...BLANK })} disabled={fields.length >= L.templateMax} data-testid="hr-template-add">
            {t('hrEmployee.settings.addTemplateLine')}
          </DuncitButton>
        </div>
      </Stack>
    </SectionCard>
  );
}
