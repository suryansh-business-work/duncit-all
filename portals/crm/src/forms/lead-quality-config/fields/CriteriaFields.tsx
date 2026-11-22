import { useId } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Alert, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { QUALITY_LIMITS } from '../../../lib/generated/lead-quality-rules';
import { issueMessage, issuesAt } from '../lead-quality-config.issues';
import { blankCriterion, type LeadQualityConfigFormValues } from '../lead-quality-config.schema';
import CriterionCard from './CriterionCard';
import { useLiveIssues } from './LiveIssues';
import WeightageTotalBar from './WeightageTotalBar';

/** The total bar reports these two; the list reports the rest (none enabled, too many). */
const TOTAL_CODES = new Set(['TOTAL_OVER', 'TOTAL_UNDER']);

/** The criteria builder: the live total, each criterion in scoring order, and Add criterion. */
export default function CriteriaFields() {
  const { t } = useTranslation();
  const headingId = useId();
  const { control, formState } = useFormContext<LeadQualityConfigFormValues>();
  const { fields, append, remove, move } = useFieldArray({ control, name: 'criteria' });
  const { issues } = useLiveIssues();
  const listIssues = issuesAt(issues, 'criteria').filter((issue) => !TOTAL_CODES.has(issue.code));

  return (
    <Stack component="section" spacing={2} aria-labelledby={headingId}>
      <div>
        <Typography id={headingId} variant="h6" component="h2" sx={{ fontWeight: 700 }}>
          {t('crm.leadQualitySettings.criteriaTitle')}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('crm.leadQualitySettings.criteriaHint')}
        </Typography>
      </div>
      <WeightageTotalBar />
      {listIssues.map((issue) => (
        <Alert key={issue.code} severity="error">
          {issueMessage(t, issue)}
        </Alert>
      ))}
      {fields.map((field, index) => (
        <CriterionCard key={field.id} index={index} count={fields.length} onMove={move} onRemove={remove} />
      ))}
      <DuncitButton
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={() => append(blankCriterion())}
        disabled={formState.disabled || fields.length >= QUALITY_LIMITS.criteria}
        sx={{ alignSelf: 'flex-start' }}
        data-testid="lead-quality-add-criterion"
      >
        {t('crm.leadQualitySettings.addCriterion')}
      </DuncitButton>
    </Stack>
  );
}
