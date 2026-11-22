import { useFormContext, useWatch } from 'react-hook-form';
import { Box, Card, CardContent, Stack } from '@mui/material';
import { FormField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { QUALITY_LIMITS } from '../../../lib/generated/lead-quality-rules';
import type { LeadQualityConfigFormValues } from '../lead-quality-config.schema';
import CheckFields from './CheckFields';
import RowControls from './RowControls';
import SubCriteriaFields from './SubCriteriaFields';
import SwitchField from './SwitchField';

interface Props {
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
}

/**
 * One criterion: name, weightage, on/off, mandatory gate, guidance and its
 * sub-criteria. A criterion with sub-criteria is checked through them, so its
 * own check is offered only while it has none (or still holds one to clear).
 */
export default function CriterionCard({ index, count, onMove, onRemove }: Readonly<Props>) {
  const { t } = useTranslation();
  const { control, formState } = useFormContext<LeadQualityConfigFormValues>();
  const base = `criteria.${index}` as const;
  const [name, autoCheck, subs] = useWatch({ control, name: [`${base}.name`, `${base}.auto_check`, `${base}.sub_criteria`] });
  const label = name.trim() || t('crm.leadQualitySettings.untitled');
  const testId = `lead-quality-criterion-${index}`;

  return (
    <Card
      variant="outlined"
      role="group"
      aria-label={t('crm.leadQualitySettings.criterionAria', { vars: { number: index + 1, name: label } })}
      sx={{ boxShadow: 'none' }}
      data-testid={testId}
    >
      <CardContent>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'flex-start' } }}>
            <Box sx={{ flex: 3, minWidth: 0 }}>
              <FormField<LeadQualityConfigFormValues>
                name={`${base}.name`}
                label={t('crm.leadQualitySettings.criterionName')}
                required
                size="small"
                slotProps={{ htmlInput: { maxLength: QUALITY_LIMITS.name, 'data-testid': `${testId}-name` } }}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <FormField<LeadQualityConfigFormValues>
                name={`${base}.weightage`}
                label={t('crm.leadQualitySettings.weightage')}
                required
                size="small"
                slotProps={{ htmlInput: { inputMode: 'decimal', 'data-testid': `${testId}-weightage` } }}
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
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <SwitchField name={`${base}.enabled`} label={t('crm.leadQualitySettings.enabled')} hint={t('crm.leadQualitySettings.enabledHint')} />
            <SwitchField
              name={`${base}.mandatory`}
              label={t('crm.leadQualitySettings.mandatory')}
              hint={t('crm.leadQualitySettings.mandatoryCriterionHint')}
            />
          </Stack>
          {(subs.length === 0 || autoCheck !== 'NONE') && <CheckFields base={base} testId={testId} />}
          <FormField<LeadQualityConfigFormValues>
            name={`${base}.guidance`}
            label={t('crm.leadQualitySettings.guidance')}
            hint={t('crm.leadQualitySettings.guidanceHint')}
            size="small"
            multiline
            minRows={2}
            slotProps={{ htmlInput: { maxLength: QUALITY_LIMITS.guidance } }}
          />
          <SubCriteriaFields criterionIndex={index} />
        </Stack>
      </CardContent>
    </Card>
  );
}
