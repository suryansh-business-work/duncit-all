import { useCallback, useState } from 'react';
import { Alert, CircularProgress, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { unavailableKey, type AskDuncitAttachmentView } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import AskDuncitHeader from './AskDuncitHeader';
import Composer from './Composer';
import HandoverDialog from './HandoverDialog';
import HistoryDrawer from './HistoryDrawer';
import MessageList from './MessageList';
import { AlertsBar, EmptyState, SuggestionBubbles } from './Suggestions';
import { useAskDuncit } from './useAskDuncit';
import { useVoice } from './useVoice';

/**
 * Ask Duncit — the role-based assistant (menu › Ask Duncit). What it may see
 * and do is decided on the server for the person's role; this page renders the
 * conversation and sends what the person asks. Native twin: AskDuncitScreen.
 */
export default function AskDuncitPage() {
  const { t } = useTranslation();
  const ai = useAskDuncit();
  const voice = useVoice(ai.bootstrap?.role_key ?? 'MEMBER');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [pinKey, setPinKey] = useState(0);
  const { bootstrap, thread } = ai;

  const send = useCallback(
    (text: string, attachments: AskDuncitAttachmentView[] = []) => {
      setPinKey((n) => n + 1);
      ai.send(text, attachments).catch(() => undefined);
    },
    [ai]
  );
  const speak = useCallback(
    (id: string, text: string) => {
      voice.speak(id, text).catch(() => undefined);
    },
    [voice]
  );

  if (ai.bootstrapLoading && !bootstrap) {
    return (
      <Stack sx={{ alignItems: 'center', py: 6 }}>
        <CircularProgress aria-label={t('askDuncit.loading')} />
      </Stack>
    );
  }
  if (ai.bootstrapError && !bootstrap) {
    return (
      <Alert severity="error" sx={{ m: 2 }} action={<DuncitButton color="inherit" size="small" onClick={() => { ai.retryBootstrap().catch(() => undefined); }}>{t('askDuncit.retry')}</DuncitButton>}>
        {t('askDuncit.errors.INTERNAL')}
      </Alert>
    );
  }

  const available = Boolean(bootstrap?.available);
  const streaming = Boolean(thread.streamingId);
  const features = bootstrap?.features;

  return (
    <Stack data-testid="ask-duncit-page" sx={{ height: '100%', minHeight: 0 }}>
      <AskDuncitHeader
        roleKey={bootstrap?.role_key ?? null}
        showHistory={Boolean(features?.chat_history)}
        canHandOver={Boolean(features?.handover && thread.conversationId)}
        onHistory={() => setHistoryOpen(true)}
        onNew={ai.newConversation}
        onHandOver={() => setHandoverOpen(true)}
      />
      {available ? (
        <>
          <AlertsBar alerts={bootstrap?.alerts ?? []} onAsk={send} />
          {ai.loadError && <Alert severity="error" sx={{ m: 1.5 }}>{t('askDuncit.errors.INTERNAL')}</Alert>}
          <MessageList
            messages={thread.messages}
            hasMore={thread.hasMore}
            loadingOlder={ai.loading}
            pinKey={pinKey}
            canRollback={Boolean(features?.rollback)}
            voice={Boolean(features?.voice)}
            speakingId={voice.speakingId}
            empty={<EmptyState />}
            onLoadOlder={() => { ai.loadOlder().catch(() => undefined); }}
            onDecide={(id, approve) => { ai.decide(id, approve).catch(() => undefined); }}
            onRollback={(id) => { ai.rollback(id).catch(() => undefined); }}
            onRate={(id, rating) => { ai.rate(id, rating).catch(() => undefined); }}
            onSpeak={speak}
          />
          {!streaming && <SuggestionBubbles suggestions={thread.messages.length ? (bootstrap?.suggestions ?? []).slice(0, 3) : bootstrap?.suggestions ?? []} disabled={ai.sending} onPick={send} />}
          <Composer
            streaming={streaming}
            sending={ai.sending}
            maxChars={bootstrap?.limits.max_input_chars ?? 4000}
            maxAttachments={features?.uploads ? bootstrap?.limits.max_attachments ?? 0 : 0}
            voiceEnabled={Boolean(features?.voice)}
            recording={voice.recording}
            transcribing={voice.transcribing}
            onSend={send}
            onStop={ai.stop}
            onRecordStart={voice.start}
            onRecordStop={voice.stop}
          />
        </>
      ) : (
        <Alert severity="info" sx={{ m: 2 }} data-testid="ask-duncit-unavailable">
          {t(unavailableKey(bootstrap?.unavailable_reason))}
        </Alert>
      )}
      <HistoryDrawer open={historyOpen} activeId={thread.conversationId} showMemory={Boolean(features?.memory)} onClose={() => setHistoryOpen(false)} />
      <HandoverDialog open={handoverOpen} busy={ai.handingOver} onClose={() => setHandoverOpen(false)} onSubmit={ai.handover} />
    </Stack>
  );
}
