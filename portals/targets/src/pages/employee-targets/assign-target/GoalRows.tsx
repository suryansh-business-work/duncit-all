import { useFieldArray, useFormState } from 'react-hook-form';
import { Box, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { EMPLOYEE_TARGET_LIMITS as L } from '@duncit/utils';
import { EMPTY_GOAL } from './assign-target.schema';
import type { AssignTargetControl } from './assign-target.types';

/**
 * The month's goals, as many rows as the admin needs (1 to the server's
 * maximum): a title, an optional description, and an optional figure with what
 * it counts. The last row cannot be removed — a target has at least one goal.
 */
export default function GoalRows({ control }: Readonly<{ control: AssignTargetControl }>) {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({ control, name: 'goals' });
  const { errors } = useFormState({ control, name: 'goals' });
  const listError = errors.goals?.root?.message ?? errors.goals?.message;

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2" component="h3">
        {t('employeeTargets.goals.title')}
      </Typography>
      {fields.map((field, index) => (
        <Box key={field.id} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5 }} data-testid="assign-target-goal">
          <Stack spacing={1}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {t('employeeTargets.form.goalHeading', { vars: { index: index + 1 } })}
              </Typography>
              <DuncitIconButton
                aria-label={t('employeeTargets.form.removeGoal', { vars: { index: index + 1 } })}
                disabled={fields.length <= 1}
                onClick={() => remove(index)}
              >
                <DeleteOutlinedIcon />
              </DuncitIconButton>
            </Stack>
            <RhfTextField
              control={control}
              name={`goals.${index}.title`}
              label={t('employeeTargets.form.goalTitle')}
              required
              size="small"
              slotProps={{ htmlInput: { maxLength: L.goalTitleMax, 'data-testid': `assign-target-goal-title-${index}` } }}
            />
            <RhfTextField
              control={control}
              name={`goals.${index}.description`}
              label={t('employeeTargets.form.goalDescription')}
              multiline
              minRows={1}
              maxRows={4}
              size="small"
              slotProps={{ htmlInput: { maxLength: L.goalDescriptionMax } }}
            />
            <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
              <RhfTextField
                control={control}
                name={`goals.${index}.target_value`}
                label={t('employeeTargets.form.goalTarget')}
                hint={t('employeeTargets.form.goalTargetHint')}
                size="small"
                slotProps={{ htmlInput: { inputMode: 'decimal', 'data-testid': `assign-target-goal-target-${index}` } }}
              />
              <RhfTextField
                control={control}
                name={`goals.${index}.unit`}
                label={t('employeeTargets.form.goalUnit')}
                size="small"
                slotProps={{ htmlInput: { maxLength: L.goalUnitMax } }}
              />
            </Box>
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
          disabled={fields.length >= L.goalsMax}
          onClick={() => append({ ...EMPTY_GOAL })}
          data-testid="assign-target-add-goal"
        >
          {t('employeeTargets.form.addGoal')}
        </DuncitButton>
      </Box>
    </Stack>
  );
}
