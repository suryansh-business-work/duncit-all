import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, LinearProgress, Stack, Typography } from '@mui/material';
import { notify } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { COMPLETE_OUTREACH_TASK, OUTREACH_TASKS, type OutreachTask } from '../queries';
import TaskCard from './TaskCard';

/**
 * The DMs a sequence asked a person to send. Nothing is sent from here: the
 * person writes on Instagram, then marks the task done and the lead's walk
 * carries on.
 */
export default function TasksTab() {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery<{ outreachTasks: OutreachTask[] }>(OUTREACH_TASKS, { fetchPolicy: 'cache-and-network' });
  const [complete, completeState] = useMutation<{ completeOutreachTask: OutreachTask }>(COMPLETE_OUTREACH_TASK);
  const tasks = data?.outreachTasks ?? [];

  const markDone = async (task: OutreachTask) => {
    try {
      await complete({ variables: { id: task.id, note: null } });
      notify(t('marketing.outreach.taskDone', { vars: { name: task.lead_name } }), 'success');
      await refetch();
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  };

  return (
    <Stack spacing={2} data-testid="tasks-tab">
      <Typography variant="body2" color="text.secondary">
        {t('marketing.outreach.tasksHint')}
      </Typography>
      {loading && !data && <LinearProgress />}
      {error && <Alert severity="error">{parseApiError(error)}</Alert>}
      {data && tasks.length === 0 && (
        <Alert severity="info" data-testid="tasks-empty">
          {t('marketing.outreach.emptyTasks')}
        </Alert>
      )}
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} busy={completeState.loading} onDone={markDone} />
      ))}
    </Stack>
  );
}
