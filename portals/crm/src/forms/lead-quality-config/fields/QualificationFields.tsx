import { useId } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Box, Stack, Typography } from '@mui/material';
import { FormField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import type { LeadQualityConfigFormValues } from '../lead-quality-config.schema';
import SwitchField from './SwitchField';

/** When a lead qualifies: on its mandatory gates alone, or on the gates plus a minimum score. */
export default function QualificationFields() {
  const { t } = useTranslation();
  const headingId = useId();
  const { control } = useFormContext<LeadQualityConfigFormValues>();
  const gatesOnly = useWatch({ control, name: 'qualify_on_gates' });

  return (
    <Stack component="section" spacing={1.5} aria-labelledby={headingId}>
      <Typography id={headingId} variant="h6" component="h2" sx={{ fontWeight: 700 }}>
        {t('crm.leadQualitySettings.qualificationTitle')}
      </Typography>
      <SwitchField name="qualify_on_gates" label={t('crm.leadQualitySettings.gatesOnly')} hint={t('crm.leadQualitySettings.gatesOnlyHint')} />
      {!gatesOnly && (
        <Box sx={{ maxWidth: { sm: '50%' } }}>
          <FormField<LeadQualityConfigFormValues>
            name="min_qualification_score"
            label={t('crm.leadQualitySettings.minScore')}
            hint={t('crm.leadQualitySettings.minScoreHint')}
            required
            size="small"
            slotProps={{ htmlInput: { inputMode: 'decimal', 'data-testid': 'lead-quality-min-score' } }}
          />
        </Box>
      )}
    </Stack>
  );
}
