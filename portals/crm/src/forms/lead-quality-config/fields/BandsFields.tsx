import { useId } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Alert, Box, Chip, MenuItem, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { FormField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { BAND_TONES, QUALITY_LIMITS, type BandTone } from '../../../lib/generated/lead-quality-rules';
import { issueMessage, issuesAt } from '../lead-quality-config.issues';
import { blankBand, type LeadQualityConfigFormValues } from '../lead-quality-config.schema';
import { useLiveIssues } from './LiveIssues';
import RowControls from './RowControls';

const TONE_KEY: Record<BandTone, string> = {
  success: 'crm.leadQualitySettings.toneSuccess',
  warning: 'crm.leadQualitySettings.toneWarning',
  error: 'crm.leadQualitySettings.toneError',
};

/** The classification bands: a name, the score each starts at and its ring colour. */
export default function BandsFields() {
  const { t } = useTranslation();
  const headingId = useId();
  const { control, formState } = useFormContext<LeadQualityConfigFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 'bands' });
  const { values, issues } = useLiveIssues();

  return (
    <Stack component="section" spacing={1.5} aria-labelledby={headingId}>
      <div>
        <Typography id={headingId} variant="h6" component="h2" sx={{ fontWeight: 700 }}>
          {t('crm.leadQualitySettings.bandsTitle')}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('crm.leadQualitySettings.bandsHint')}
        </Typography>
      </div>
      {issuesAt(issues, 'bands').map((issue) => (
        <Alert key={issue.code} severity="error">
          {issueMessage(t, issue)}
        </Alert>
      ))}
      {fields.map((field, index) => {
        const label = values.bands[index]?.label.trim() || t('crm.leadQualitySettings.untitled');
        return (
          <Stack key={field.id} direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'flex-start' } }} data-testid={`lead-quality-band-${index}`}>
            <Box sx={{ flex: 2, minWidth: 0 }}>
              <FormField<LeadQualityConfigFormValues>
                name={`bands.${index}.label`}
                label={t('crm.leadQualitySettings.bandLabel')}
                required
                size="small"
                slotProps={{ htmlInput: { maxLength: QUALITY_LIMITS.name } }}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <FormField<LeadQualityConfigFormValues>
                name={`bands.${index}.min`}
                label={t('crm.leadQualitySettings.bandMin')}
                required
                size="small"
                slotProps={{ htmlInput: { inputMode: 'decimal', 'data-testid': `lead-quality-band-${index}-min` } }}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <FormField<LeadQualityConfigFormValues> select name={`bands.${index}.tone`} label={t('crm.leadQualitySettings.bandTone')} size="small">
                {BAND_TONES.map((tone) => (
                  <MenuItem key={tone} value={tone}>
                    <Chip size="small" color={tone} label={t(TONE_KEY[tone])} />
                  </MenuItem>
                ))}
              </FormField>
            </Box>
            <RowControls label={label} index={index} count={fields.length} disabled={formState.disabled} onRemove={remove} testId={`lead-quality-band-${index}`} />
          </Stack>
        );
      })}
      <DuncitButton
        size="small"
        startIcon={<AddIcon />}
        onClick={() => append(blankBand())}
        disabled={formState.disabled || fields.length >= QUALITY_LIMITS.bands}
        sx={{ alignSelf: 'flex-start' }}
        data-testid="lead-quality-add-band"
      >
        {t('crm.leadQualitySettings.addBand')}
      </DuncitButton>
    </Stack>
  );
}
