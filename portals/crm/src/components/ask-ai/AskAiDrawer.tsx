import { Box, Drawer, Stack, Tooltip, Typography } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CloseIcon from '@mui/icons-material/Close';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { DuncitIconButton } from '@duncit/buttons';
import { tokens } from '@duncit/theme';
import { PageErrorBoundary, useTranslation } from '@duncit/shell';
import type { CrmLeadEntityType } from '../../api/crm.types';
import AskAiContextPanel from './AskAiContextPanel';
import AskAiMessageList from './AskAiMessageList';
import AskAiComposer from './AskAiComposer';
import AskAiActionDialogs, { type AskAiLead } from './AskAiActionDialogs';
import AskAiActionCard from './AskAiActionCard';
import { useLeadAiThread } from './useLeadAiThread';
import { useAskAiActions } from './useAskAiActions';
import { ASK_AI_PANEL_WIDTH } from './askAiLead';
import { fireAndForget, logs } from '@duncit/logs';

const HEADER_HEIGHT = tokens.size.headerHeight;
/**
 * The paper is viewport-fixed and starts under the header, so it must also
 * stop above the shell's taskbar, or the bar paints over the composer.
 */
const PAPER_HEIGHT = `calc(100% - ${HEADER_HEIGHT + tokens.size.taskbarHeight}px)`;

export const ASK_AI_WIDTH = ASK_AI_PANEL_WIDTH;
export type { AskAiLead } from './AskAiActionDialogs';

interface Props {
  open: boolean;
  entity: CrmLeadEntityType;
  lead: AskAiLead;
  /** Slug → value map from the lead, for email-template variables in the composer. */
  variableValues?: Record<string, string>;
  onClose: () => void;
}

function AskAiPanel({ entity, lead, variableValues, open, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const thread = useLeadAiThread(entity, lead.id, open);
  const actions = useAskAiActions({ entity, leadId: lead.id, setActionStatus: thread.setActionStatus, onChanged: thread.refresh });

  return (
    <Stack sx={{ height: '100%', minHeight: 0 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexShrink: 0, p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        <SmartToyIcon color="secondary" />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" component="h2" noWrap sx={{ fontWeight: 800 }}>{t('crm.components.askAi')}</Typography>
          <Typography variant="caption" noWrap sx={{ color: 'text.secondary', display: 'block' }}>
            {t('crm.askAi.about', { vars: { name: lead.display_name } })}
          </Typography>
        </Box>
        <Tooltip title={t('crm.askAi.newConversation')}>
          <span>
            <DuncitIconButton onClick={() => fireAndForget(thread.clear(), logs.portal.crm, 'AskAiDrawer', 'clear')} disabled={thread.clearing || thread.messages.length === 0} aria-label={t('crm.askAi.newConversation')}>
              <RestartAltIcon />
            </DuncitIconButton>
          </span>
        </Tooltip>
        <DuncitIconButton onClick={onClose} aria-label={t('shell.common.close')} sx={{ flexShrink: 0 }}><CloseIcon /></DuncitIconButton>
      </Stack>

      <AskAiContextPanel context={thread.context} loading={thread.loadingThread} />

      <AskAiMessageList
        messages={thread.messages}
        pending={thread.pending}
        error={actions.error ?? thread.error}
        onSuggestion={(s) => fireAndForget(thread.ask(s), logs.portal.crm, 'AskAiDrawer', 'ask')}
        renderActions={(m) =>
          actions.refsOf(m).map((ref) => (
            <AskAiActionCard
              key={`${ref.messageId}-${ref.index}`}
              action={ref.action}
              busy={actions.isBusy(ref)}
              onReviewEmail={() => actions.openEmail(ref)}
              onCreateReminder={() => fireAndForget(actions.createReminder(ref), logs.portal.crm, 'AskAiDrawer', 'createReminder')}
              onEditReminder={() => actions.openReminder(ref)}
              onApplyUpdate={() => fireAndForget(actions.applyUpdate(ref), logs.portal.crm, 'AskAiDrawer', 'applyUpdate')}
              onDismiss={() => fireAndForget(actions.dismiss(ref), logs.portal.crm, 'AskAiDrawer', 'dismiss')}
            />
          ))
        }
      />

      <AskAiComposer busy={thread.asking} onSend={thread.ask} />

      <AskAiActionDialogs entity={entity} lead={lead} variableValues={variableValues} actions={actions} />
    </Stack>
  );
}

/**
 * Persistent right drawer (below the header, no backdrop): a conversation
 * grounded in this lead's whole CRM history, which can draft emails and plan
 * reminders for the agent to confirm. A crash inside stays inside the drawer.
 */
export default function AskAiDrawer(props: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Drawer
      anchor="right"
      open={props.open}
      variant="persistent"
      slotProps={{
        paper: {
          role: 'complementary',
          'aria-label': t('crm.components.askAi'),
          sx: { width: { xs: '100%', sm: ASK_AI_WIDTH }, top: HEADER_HEIGHT, height: PAPER_HEIGHT, borderLeft: 1, borderColor: 'divider' },
        },
      }}
    >
      {props.open && (
        <PageErrorBoundary>
          <AskAiPanel {...props} />
        </PageErrorBoundary>
      )}
    </Drawer>
  );
}
