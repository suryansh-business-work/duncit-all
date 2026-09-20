import { useMemo, useState, type FormEvent } from 'react';
import type { Edge } from '@xyflow/react';
import { Alert, Box, Divider, Stack, TextField, Tooltip, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { AutomationContactForm } from '../../../forms/automation-contact';
import type { CanvasNode } from '../graph-io';
import type { AutomationChannel, FlowIssue } from '../types';
import ChatTranscript from './ChatTranscript';
import StepTrace from './StepTrace';
import { rememberedContact, useTestRun } from './useTestRun';

interface Props {
  flowId: string;
  channel: AutomationChannel;
  nodes: readonly CanvasNode[];
  edges: readonly Edge[];
  onIssues: (issues: FlowIssue[]) => void;
  onClose: () => void;
}

/**
 * The chat window for trying a flow.
 *
 * The operator plays the contact: they pick who they are, write the first
 * message, and the flow answers in the transcript the way it would on the
 * phone or in the inbox. A wait-for-reply step hands them the composer; the
 * step trace under the conversation says why each message came out as it did.
 */
export default function TestChatPanel({ flowId, channel, nodes, edges, onIssues, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const { run, starting, replying, begin, reply, reset } = useTestRun({ flowId, channel, nodes, edges, onIssues });
  const [draft, setDraft] = useState('');
  const remembered = useMemo(() => rememberedContact(), []);
  const hasAi = nodes.some((node) => node.data.kind === 'ai_compose' || node.data.kind === 'ai_classify');
  const waiting = run?.status === 'WAITING_REPLY';

  const send = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !waiting) return;
    setDraft('');
    reply(text).catch(() => undefined);
  };

  return (
    <Stack sx={{ height: '100%' }} data-testid="automation-test-panel">
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', p: 1.5, pb: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            {t('ai.automation.test.title')}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('ai.automation.test.unsavedHint')}
          </Typography>
        </Box>
        <Tooltip title={t('ai.automation.test.close')}>
          <span>
            <DuncitIconButton size="small" aria-label={t('ai.automation.test.close')} onClick={onClose} data-testid="automation-test-close">
              <CloseIcon fontSize="small" />
            </DuncitIconButton>
          </span>
        </Tooltip>
      </Stack>
      <Divider />

      {run ? (
        <>
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            <ChatTranscript run={run} />
            <Box sx={{ px: 1.5, pb: 1.5 }}>
              <StepTrace steps={run.steps} />
            </Box>
          </Box>
          <Divider />
          <Stack spacing={1} sx={{ p: 1.5 }}>
            {waiting && (
              <form onSubmit={send}>
                <Stack direction="row" spacing={1}>
                  <TextField
                    size="small"
                    fullWidth
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={t('ai.automation.test.composer')}
                    slotProps={{ htmlInput: { 'aria-label': t('ai.automation.test.composer'), 'data-testid': 'automation-test-composer' } }}
                    disabled={replying}
                  />
                  <Tooltip title={t('ai.automation.test.send')}>
                    <span>
                      <DuncitIconButton type="submit" color="primary" aria-label={t('ai.automation.test.send')} disabled={replying || !draft.trim()}>
                        <SendIcon fontSize="small" />
                      </DuncitIconButton>
                    </span>
                  </Tooltip>
                </Stack>
              </form>
            )}
            <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
              {waiting && (
                <DuncitButton size="small" variant="outlined" disabled={replying} onClick={() => reply('', true)}>
                  {t('ai.automation.test.simulateTimeout')}
                </DuncitButton>
              )}
              <DuncitButton size="small" variant="contained" onClick={reset} data-testid="automation-test-restart">
                {t('ai.automation.test.restart')}
              </DuncitButton>
            </Stack>
          </Stack>
        </>
      ) : (
        <Stack spacing={1.5} sx={{ p: 1.5, overflowY: 'auto' }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('ai.automation.test.subtitle')}
          </Typography>
          {hasAi && <Alert severity="info">{t('ai.automation.test.aiNote')}</Alert>}
          <AutomationContactForm
            channel={channel}
            showDeliver
            submitting={starting}
            submitLabel={t('ai.automation.test.start')}
            initialValues={remembered}
            onSubmit={begin}
          />
        </Stack>
      )}
    </Stack>
  );
}
