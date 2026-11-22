import { useFormContext, useWatch } from 'react-hook-form';
import { Box, Paper, Stack } from '@mui/material';
import { FormField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { QUALITY_LIMITS } from '../../../lib/generated/lead-quality-rules';
import type { LeadQualityConfigFormValues } from '../lead-quality-config.schema';
import CheckFields from './CheckFields';
import RowControls from './RowControls';
import SwitchField from './SwitchField';

interface Props {
  criterionIndex: number;
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
}

/** One sub-criterion: what is verified, the points it earns, whether it is a gate, and how it is checked. */
export default function SubCriterionRow({ criterionIndex, index, count, onMove, onRemove }: Readonly<Props>) {
  const { t } = useTranslation();
  const { control, formState } = useFormContext<LeadQualityConfigFormValues>();
  const base = `criteria.${criterionIndex}.sub_criteria.${index}` as const;
  const name = useWatch({ control, name: `${base}.name` });
  const label = name.trim() || t('crm.leadQualitySettings.untitled');
  const testId = `lead-quality-sub-${criterionIndex}-${index}`;

  return (
    <Paper
      variant="outlined"
      role="group"
      aria-label={t('crm.leadQualitySettings.subAria', { vars: { number: index + 1, name: label } })}
      sx={{ p: 1.5 }}
      data-testid={testId}
    >
      <Stack spacing={1.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'flex-start' } }}>
          <Box sx={{ flex: 3, minWidth: 0 }}>
            <FormField<LeadQualityConfigFormValues>
              name={`${base}.name`}
              label={t('crm.leadQualitySettings.subName')}
              required
              size="small"
              slotProps={{ htmlInput: { maxLength: QUALITY_LIMITS.name, 'data-testid': `${testId}-name` } }}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <FormField<LeadQualityConfigFormValues>
              name={`${base}.points`}
              label={t('crm.leadQualitySettings.points')}
              required
              size="small"
              slotProps={{ htmlInput: { inputMode: 'decimal', 'data-testid': `${testId}-points` } }}
            />
          </Box>
          <RowControls
            label={label}
            index={index}
            count={count}
            disabled={formState.disabled}
            onMove={onMove}
            onRemove={onRemove}
            testId={testId}
          />
        </Stack>
        <SwitchField
          name={`${base}.mandatory`}
          label={t('crm.leadQualitySettings.mandatory')}
          hint={t('crm.leadQualitySettings.mandatorySubHint')}
        />
        <CheckFields base={base} testId={testId} />
        <FormField<LeadQualityConfigFormValues>
          name={`${base}.guidance`}
          label={t('crm.leadQualitySettings.guidance')}
          size="small"
          multiline
          slotProps={{ htmlInput: { maxLength: QUALITY_LIMITS.guidance } }}
        />
      </Stack>
    </Paper>
  );
}
