import { Link, Paper, Stack, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { DuncitButton } from '@duncit/buttons';
import { fireAndForget, logs } from '@duncit/logs';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import type { OutreachTask } from '../queries';

interface Props {
  task: OutreachTask;
  busy: boolean;
  onDone: (task: OutreachTask) => Promise<void>;
}

/** One DM to send by hand: who to, from which sequence, the words, and Mark done. */
export default function TaskCard({ task, busy, onDone }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });

  return (
    <Paper variant="outlined" sx={{ p: 2 }} data-testid={`task-${task.id}`}>
      <Stack spacing={1}>
        <Typography variant="subtitle2" component="h3">
          {t('marketing.outreach.taskTitle', { vars: { name: task.lead_name, sequence: task.sequence_name, number: String(task.step_index + 1) } })}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {t('marketing.outreach.taskMeta', {
            vars: {
              owner: task.owner_name ?? t('marketing.leads.unassigned'),
              at: task.created_at ? formatDateTime(new Date(task.created_at)) : '',
            },
          })}
        </Typography>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }} data-testid={`task-text-${task.id}`}>
          {task.text}
        </Typography>
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
          {task.lead_instagram_url ? (
            <Link href={task.lead_instagram_url} target="_blank" rel="noopener noreferrer" variant="body2" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
              {t('marketing.outreach.openInstagram', { vars: { handle: task.lead_instagram_handle } })}
              <OpenInNewIcon fontSize="inherit" aria-hidden />
            </Link>
          ) : (
            <Typography variant="body2" color="text.secondary" data-testid={`task-no-handle-${task.id}`}>
              {t('marketing.outreach.noHandle')}
            </Typography>
          )}
          <DuncitButton
            size="small"
            variant="contained"
            startIcon={<CheckCircleOutlineIcon />}
            disabled={busy}
            onClick={() => fireAndForget(onDone(task), logs.portal.marketing, 'outreach', 'TaskCard')}
            data-testid={`task-done-${task.id}`}
          >
            {t('marketing.outreach.markDone')}
          </DuncitButton>
        </Stack>
      </Stack>
    </Paper>
  );
}
