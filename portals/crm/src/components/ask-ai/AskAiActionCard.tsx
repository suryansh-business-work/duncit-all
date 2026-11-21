import { Box, Chip, Stack, Typography } from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import AlarmAddIcon from '@mui/icons-material/AlarmAdd';
import EditCalendarIcon from '@mui/icons-material/EditCalendar';
import { DuncitButton } from '@duncit/buttons';
import { htmlToText } from '@duncit/rich-text';
import { formatDateTime } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import type { AskAiAction } from '../../api/askAi.gql';

export interface AskAiActionHandlers {
  /** Open the email composer with the draft filled in. */
  onReviewEmail: () => void;
  /** Save the proposed reminder as it is. */
  onCreateReminder: () => void;
  /** Open the reminder dialog with the proposal filled in. */
  onEditReminder: () => void;
  /** Apply the proposed change to an existing reminder. */
  onApplyUpdate: () => void;
  onDismiss: () => void;
}

interface Props extends AskAiActionHandlers {
  action: AskAiAction;
  busy: boolean;
}

const preview = (html: string) => {
  const text = htmlToText(html).replace(/\s+/g, ' ').trim();
  return text.length > 180 ? `${text.slice(0, 180)}…` : text;
};

function Details({ action }: Readonly<{ action: AskAiAction }>) {
  const { t } = useTranslation();
  const line = (label: string, value?: string | null) =>
    value ? (
      <Typography variant="caption" sx={{ display: 'block', wordBreak: 'break-word' }}>
        <b>{label}:</b> <span>{value}</span>
      </Typography>
    ) : null;

  if (action.type === 'EMAIL_DRAFT') {
    return (
      <>
        {line(t('crm.askAi.to'), action.to || t('crm.askAi.noRecipient'))}
        {line(t('crm.common.subject'), action.subject)}
        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.5 }}>{preview(action.body_html ?? '')}</Typography>
      </>
    );
  }
  let status: string | null = null;
  if (action.reminder_status === 'DONE') status = t('crm.askAi.markDone');
  else if (action.reminder_status === 'PENDING') status = t('crm.askAi.markPending');
  return (
    <>
      {line(t('shell.common.title'), action.title)}
      {line(t('crm.askAi.due'), action.due_at ? formatDateTime(action.due_at) : null)}
      {line(t('crm.components.notes'), action.notes)}
      {line(t('shell.common.status'), status)}
    </>
  );
}

const HEADINGS = {
  EMAIL_DRAFT: { key: 'crm.askAi.emailDraft', icon: <EmailIcon fontSize="small" color="primary" /> },
  CREATE_REMINDER: { key: 'crm.askAi.newReminder', icon: <AlarmAddIcon fontSize="small" color="primary" /> },
  UPDATE_REMINDER: { key: 'crm.askAi.reminderChange', icon: <EditCalendarIcon fontSize="small" color="primary" /> },
} as const;

/** One proposal under an answer. Nothing is sent or saved until the agent presses a button here. */
export default function AskAiActionCard({ action, busy, onReviewEmail, onCreateReminder, onEditReminder, onApplyUpdate, onDismiss }: Readonly<Props>) {
  const { t } = useTranslation();
  const heading = HEADINGS[action.type];
  const proposed = action.status === 'PROPOSED';

  return (
    <Box data-testid="crm-ask-ai-action" sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1, bgcolor: 'background.paper' }}>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: 0.5 }}>
        {heading.icon}
        <Typography variant="caption" sx={{ fontWeight: 800, flex: 1 }}>{t(heading.key)}</Typography>
        {action.status === 'DONE' && <Chip size="small" color="success" label={t('crm.components.done')} />}
        {action.status === 'DISMISSED' && <Chip size="small" label={t('crm.askAi.dismissed')} />}
      </Stack>
      <Details action={action} />
      {action.result_message && (
        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.5 }}>{action.result_message}</Typography>
      )}
      {proposed && (
        <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap', mt: 1 }}>
          {action.type === 'EMAIL_DRAFT' && (
            <DuncitButton size="small" variant="contained" onClick={onReviewEmail} disabled={busy}>{t('crm.askAi.reviewAndSend')}</DuncitButton>
          )}
          {action.type === 'CREATE_REMINDER' && (
            <>
              <DuncitButton size="small" variant="contained" onClick={onCreateReminder} disabled={busy}>{t('crm.askAi.createReminder')}</DuncitButton>
              <DuncitButton size="small" onClick={onEditReminder} disabled={busy}>{t('shell.common.edit')}</DuncitButton>
            </>
          )}
          {action.type === 'UPDATE_REMINDER' && (
            <DuncitButton size="small" variant="contained" onClick={onApplyUpdate} disabled={busy}>{t('crm.askAi.applyChange')}</DuncitButton>
          )}
          <DuncitButton size="small" onClick={onDismiss} disabled={busy}>{t('crm.askAi.dismiss')}</DuncitButton>
        </Stack>
      )}
    </Box>
  );
}
