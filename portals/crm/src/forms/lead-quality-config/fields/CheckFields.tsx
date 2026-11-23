import { useFormContext, useWatch } from 'react-hook-form';
import { Box, MenuItem, Stack } from '@mui/material';
import { FormField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { AUTO_CHECKS, THRESHOLD_CHECKS, type AutoCheck } from '../../../lib/generated/lead-quality-rules';
import { AUTO_CHECK_KEY, keyOr } from '../../../components/lead-quality/qualityLabels';
import type { LeadQualityConfigFormValues } from '../lead-quality-config.schema';

/** A criterion, or one of its sub-criteria — the two places a check can be set. */
export type ItemBase = `criteria.${number}` | `criteria.${number}.sub_criteria.${number}`;

/** What the threshold means for each check that takes one. */
const THRESHOLD_HINT_KEY: Partial<Record<AutoCheck, string>> = {
  INSTAGRAM_FOLLOWERS_MIN: 'crm.leadQualitySettings.thresholdFollowers',
  INSTAGRAM_RECENT_POST_DAYS: 'crm.leadQualitySettings.thresholdRecentDays',
  GOOGLE_REVIEWS_MIN: 'crm.leadQualitySettings.thresholdReviews',
};

/**
 * The automatic check of one item and, only for the follower, recent-post and
 * review checks, the number it compares against. Any other check keeps no
 * threshold, so the field is not shown for it.
 */
export default function CheckFields({ base, testId }: Readonly<{ base: ItemBase; testId: string }>) {
  const { t } = useTranslation();
  const { control } = useFormContext<LeadQualityConfigFormValues>();
  const check = useWatch({ control, name: `${base}.auto_check` });
  const hintKey = THRESHOLD_HINT_KEY[check];

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
      <Box sx={{ flex: 2 }}>
        <FormField<LeadQualityConfigFormValues>
          select
          name={`${base}.auto_check`}
          label={t('crm.leadQualitySettings.autoCheck')}
          size="small"
          slotProps={{ htmlInput: { 'data-testid': `${testId}-check` } }}
        >
          {AUTO_CHECKS.map((option) => (
            <MenuItem key={option} value={option}>
              {t(keyOr(AUTO_CHECK_KEY, option, 'crm.leadQuality.autoNone'))}
            </MenuItem>
          ))}
        </FormField>
      </Box>
      {THRESHOLD_CHECKS.includes(check) && (
        <Box sx={{ flex: 1 }}>
          <FormField<LeadQualityConfigFormValues>
            name={`${base}.threshold`}
            label={t('crm.leadQualitySettings.threshold')}
            hint={hintKey ? t(hintKey) : undefined}
            required
            size="small"
            slotProps={{ htmlInput: { inputMode: 'numeric', 'data-testid': `${testId}-threshold` } }}
          />
        </Box>
      )}
    </Stack>
  );
}
