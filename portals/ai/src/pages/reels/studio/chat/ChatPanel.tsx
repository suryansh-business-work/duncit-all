import { Box, Divider, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { ReelChatForm } from '../../../../forms/reel-chat';
import type { ReelProject } from '../../types';
import type { ReelActions } from '../useReelActions';
import ChatTranscript from './ChatTranscript';
import { useReelChat } from './useReelChat';
import { useSavedPrompts } from './useSavedPrompts';

interface Props {
  project: ReelProject;
  actions: ReelActions;
}

/**
 * The right pane: the conversation that edits the reel.
 *
 * Every request goes to the editor with the reel as it stands, and comes back
 * as the reel as it should be — so the chat is the edit history too, and any
 * reply that changed the reel can put its version back.
 */
export default function ChatPanel({ project, actions }: Readonly<Props>) {
  const { t } = useTranslation();
  const chat = useReelChat(project.id);
  const savedPrompts = useSavedPrompts();

  return (
    <Stack component="section" aria-labelledby="reel-chat-title" sx={{ height: '100%', minHeight: 0 }} data-testid="reel-chat-panel">
      <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
        <Typography id="reel-chat-title" variant="subtitle2" component="h2" sx={{ fontWeight: 700 }}>
          {t('ai.reels.chat.title')}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
          {t('ai.reels.chat.hint')}
        </Typography>
      </Box>
      <Divider />
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <ChatTranscript messages={project.messages} assets={project.assets} pending={chat.pending} onRestore={actions.restoreVersion} />
      </Box>
      <Divider />
      <ReelChatForm busy={chat.sending} savedPrompts={savedPrompts} onSend={chat.send} />
    </Stack>
  );
}
