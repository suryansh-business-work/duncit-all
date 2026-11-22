import { useId } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { QUALITY_LIMITS } from '../../../lib/generated/lead-quality-rules';
import { blankSubCriterion, type LeadQualityConfigFormValues } from '../lead-quality-config.schema';
import SubCriterionRow from './SubCriterionRow';
import SubTotalFeedback from './SubTotalFeedback';

/** A criterion's sub-criteria: each earns points out of the criterion's weightage. */
export default function SubCriteriaFields({ criterionIndex }: Readonly<{ criterionIndex: number }>) {
  const { t } = useTranslation();
  const headingId = useId();
  const { control, formState } = useFormContext<LeadQualityConfigFormValues>();
  const { fields, append, remove, move } = useFieldArray({ control, name: `criteria.${criterionIndex}.sub_criteria` });

  return (
    <Stack spacing={1.5} role="group" aria-labelledby={headingId}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'space-between' }}>
        <Typography id={headingId} variant="subtitle2" component="h3" sx={{ fontWeight: 700 }}>
          {t('crm.leadQualitySettings.subCriteriaTitle')}
        </Typography>
        <SubTotalFeedback index={criterionIndex} />
      </Stack>
      {fields.length === 0 && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('crm.leadQualitySettings.noSubCriteria')}
        </Typography>
      )}
      {fields.map((field, index) => (
        <SubCriterionRow
          key={field.id}
          criterionIndex={criterionIndex}
          index={index}
          count={fields.length}
          onMove={move}
          onRemove={remove}
        />
      ))}
      <DuncitButton
        size="small"
        startIcon={<AddIcon />}
        onClick={() => append(blankSubCriterion())}
        disabled={formState.disabled || fields.length >= QUALITY_LIMITS.subCriteria}
        sx={{ alignSelf: 'flex-start' }}
        data-testid={`lead-quality-add-sub-${criterionIndex}`}
      >
        {t('crm.leadQualitySettings.addSubCriterion')}
      </DuncitButton>
    </Stack>
  );
}
