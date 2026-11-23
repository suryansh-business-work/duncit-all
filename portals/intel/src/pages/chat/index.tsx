import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Alert, Box, Button, Container, Skeleton, Stack, Typography } from '@mui/material';
import AddCommentOutlinedIcon from '@mui/icons-material/AddCommentOutlined';
import { useTranslation } from '@duncit/app-settings';
import { notifyError } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useBootstrap } from '../../components/IntelBootstrap';
import Composer from './composer/Composer';
import MessageList from './messages/MessageList';
import StartScreen from './StartScreen';
import { useChatThread } from './useChatThread';
import { useComposerSettings } from './useComposerSettings';

/**
 * The chat: the start screen until the first message, then the thread with
 * streaming answers. The composer sticks to the bottom on every screen size.
 */
export default function ChatPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const { data: boot } = useBootstrap();
  const chat = useChatThread(conversationId);
  const { settings, change } = useComposerSettings(chat.conversation, boot);
  const [draft, setDraft] = useState('');
  const busy = chat.sending || chat.streaming;

  const send = (input: Parameters<typeof chat.send>[0]) =>
    chat.send({ model: settings.model, environment: settings.environment, sources: settings.sources, ...input }).catch((err) => notifyError(parseApiError(err, t('intel.chat.sendFailed'))));
  const streamingId = chat.messages.find((m) => m.status === 'STREAMING')?.id;
  const empty = !conversationId && !chat.pendingText;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: { xs: 'calc(100dvh - 120px)', md: 'calc(100dvh - 140px)' } }}>
      {conversationId && (
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1, pb: 1, borderBottom: 1, borderColor: 'divider' }}>
          <Typography component="h1" variant="h6" noWrap sx={{ flex: 1, fontWeight: 700 }}>
            {chat.conversation?.title ?? <Skeleton width={200} />}
          </Typography>
          <Button size="small" startIcon={<AddCommentOutlinedIcon />} onClick={() => navigate('/')}>
            {t('intel.chat.newChat')}
          </Button>
        </Stack>
      )}
      <Container maxWidth="md" disableGutters sx={{ flex: 1, overflowY: 'auto', px: { xs: 0, sm: 1 } }}>
        {chat.error && (
          <Alert severity="error" sx={{ mt: 2 }} action={<Button color="inherit" size="small" onClick={chat.refetch}>{t('intel.common.retry')}</Button>}>
            {t('intel.chat.loadFailed')}
          </Alert>
        )}
        {empty && <StartScreen environment={settings.environment} onPrompt={setDraft} />}
        {chat.loading && <Stack spacing={2} sx={{ py: 3 }}>{[0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={64} />)}</Stack>}
        {!empty && !chat.loading && (
          <MessageList
            messages={chat.messages}
            live={chat.live}
            pendingText={chat.pendingText}
            busy={busy}
            onEdit={(id, text) => send({ message: text, edit_message_id: id })}
            onRegenerate={() => send({ regenerate: true })}
          />
        )}
      </Container>
      <Box sx={{ position: 'sticky', bottom: 0, pt: 1, pb: { xs: 1, md: 2 }, bgcolor: 'background.default' }}>
        <Container maxWidth="md" disableGutters>
          <Composer
            settings={settings}
            onSettings={change}
            models={boot?.models ?? []}
            environments={boot?.me.environments ?? ['STAGING']}
            allowedSources={boot?.me.sources ?? []}
            busy={chat.sending}
            streaming={chat.streaming}
            draft={draft}
            onDraft={setDraft}
            onSend={(text) => send({ message: text })}
            onStop={() => streamingId && chat.stop(streamingId)}
          />
          <Typography variant="caption" color="text.secondary" component="p" sx={{ textAlign: 'center', mt: 0.75 }}>
            {t('intel.chat.disclaimer')}
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
