import { Divider, Stack, Typography } from '@mui/material';
import { SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import type { EmployeeTargetGoal } from '@duncit/utils';

/** The goals the Targets team set for the month, with any figure and note they added. */
export default function TargetGoalsCard({ goals, notes }: Readonly<{ goals: EmployeeTargetGoal[]; notes: string }>) {
  const { t } = useTranslation();
  return (
    <SectionCard title={t('employeeTargets.goals.title')}>
      <Stack spacing={1} divider={<Divider flexItem />} component="ol" sx={{ m: 0, p: 0, listStyle: 'none' }} data-testid="my-target-goals">
        {goals.map((goal, index) => (
          <Stack component="li" key={`${index}-${goal.title}`} spacing={0.25}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {t('employeeTargets.goals.numbered', { vars: { index: index + 1, title: goal.title } })}
            </Typography>
            {goal.description && (
              <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-line' }}>
                {goal.description}
              </Typography>
            )}
            {goal.target_value !== null && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {t('employeeTargets.goals.target', { vars: { value: goal.target_value, unit: goal.unit } })}
              </Typography>
            )}
          </Stack>
        ))}
      </Stack>
      {notes && (
        <Typography variant="body2" sx={{ mt: 1.5, whiteSpace: 'pre-line' }}>
          {t('employeeTargets.goals.notes', { vars: { notes } })}
        </Typography>
      )}
    </SectionCard>
  );
}
