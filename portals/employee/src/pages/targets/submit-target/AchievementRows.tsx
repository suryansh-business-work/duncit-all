import { useFieldArray, useFormState } from 'react-hook-form';
import { Box, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import { EMPLOYEE_TARGET_LIMITS as L } from '@duncit/utils';
import { EMPTY_ACHIEVEMENT } from './submit-target.schema';
import type { SubmitTargetControl } from './submit-target.types';

/**
 * As many achievements as the month had (1 to the server's maximum), each a
 * title and its details. The last row stays — a report has at least one.
 */
export default function AchievementRows({ control }: Readonly<{ control: SubmitTargetControl }>) {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({ control, name: 'achievements' });
  const { errors } = useFormState({ control, name: 'achievements' });
  const listError = errors.achievements?.root?.message ?? errors.achievements?.message;

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2" component="h3">
        {t('employeeTargets.submission.achievements')}
      </Typography>
      {fields.map((field, index) => (
        <Box key={field.id} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5 }} data-testid="submit-target-achievement">
          <Stack spacing={1}>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {t('employeeTargets.submitForm.achievementHeading', { vars: { index: index + 1 } })}
              </Typography>
              <DuncitIconButton
                aria-label={t('employeeTargets.submitForm.removeAchievement', { vars: { index: index + 1 } })}
                disabled={fields.length <= 1}
                onClick={() => remove(index)}
                data-testid={`submit-target-remove-${index}`}
              >
                <DeleteOutlinedIcon />
              </DuncitIconButton>
            </Stack>
            <RhfTextField
              control={control}
              name={`achievements.${index}.title`}
              label={t('employeeTargets.submitForm.achievementTitle')}
              required
              size="small"
              slotProps={{ htmlInput: { maxLength: L.achievementTitleMax, 'data-testid': `submit-target-title-${index}` } }}
            />
            <RhfTextField
              control={control}
              name={`achievements.${index}.details`}
              label={t('employeeTargets.submitForm.achievementDetails')}
              multiline
              minRows={2}
              maxRows={6}
              size="small"
              slotProps={{ htmlInput: { maxLength: L.achievementDetailsMax, 'data-testid': `submit-target-details-${index}` } }}
            />
          </Stack>
        </Box>
      ))}
      {listError && (
        <Typography variant="caption" role="alert" sx={{ color: 'error.main' }}>
          {listError}
        </Typography>
      )}
      <Box>
        <DuncitButton
          variant="outlined"
          startIcon={<AddIcon />}
          disabled={fields.length >= L.achievementsMax}
          onClick={() => append({ ...EMPTY_ACHIEVEMENT })}
          data-testid="submit-target-add"
        >
          {t('employeeTargets.submitForm.addAchievement')}
        </DuncitButton>
      </Box>
    </Stack>
  );
}
