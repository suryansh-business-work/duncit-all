import { useEffect, useRef, useState } from 'react';
import { gql, useMutation } from '@apollo/client';
import {
  Avatar,
  Box,
  CircularProgress,
  Drawer,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import { tokens } from '@duncit/theme';
import RichTextField from '../../forms/fields/RichTextField';
import { parseApiError } from '../../utils/parseApiError';

const HEADER_HEIGHT = tokens.size.headerHeight;

const CRM_LEAD_AI_CHAT = gql`
  mutation CrmLeadAiChat($entity: CrmAiEntity!, $lead_id: ID!, $messages: [CrmChatMessageInput!]!) {
    crmLeadAiChat(entity: $entity, lead_id: $lead_id, messages: $messages)
  }
`;

export const ASK_AI_WIDTH = 420;

interface ChatMsg { id: string; role: 'user' | 'assistant'; content: string }

/** The local `id` is a stable render key only — it is never sent to the API. */
const toPayload = (list: ChatMsg[]) => list.map(({ role, content }) => ({ role, content }));

interface Props {
  open: boolean;
  entity: 'VENUE_LEAD' | 'HOST_LEAD';
  leadId: string;
  leadName: string;
  onClose: () => void;
}

const SUGGESTIONS = ['Summarise this lead', 'Draft a follow-up email', 'Any upcoming reminders?'];

/** Persistent right drawer (below the header, no backdrop) — chat grounded in this lead. */
export default function AskAiDrawer({ open, entity, leadId, leadName, onClose }: Readonly<Props>) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [chat, { loading }] = useMutation<{ crmLeadAiChat: string }>(CRM_LEAD_AI_CHAT);
  const endRef = useRef<HTMLDivElement | null>(null);
  const msgIdRef = useRef(0);

  const newMsg = (role: ChatMsg['role'], content: string): ChatMsg => {
    msgIdRef.current += 1;
    return { id: `msg-${msgIdRef.current}`, role, content };
  };

  // Auto-scroll to the newest message (and while the assistant is thinking).
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || loading) return;
    setError(null);
    const next: ChatMsg[] = [...messages, newMsg('user', content)];
    setMessages(next);
    setInput('');
    try {
      const res = await chat({ variables: { entity, lead_id: leadId, messages: toPayload(next) } });
      setMessages([...next, newMsg('assistant', res.data?.crmLeadAiChat ?? '')]);
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      variant="persistent"
      PaperProps={{ sx: { width: { xs: '100%', sm: ASK_AI_WIDTH }, top: HEADER_HEIGHT, height: `calc(100% - ${HEADER_HEIGHT}px)`, borderLeft: 1, borderColor: 'divider' } }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        <SmartToyIcon color="secondary" />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={800} noWrap>Ask AI</Typography>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>About {leadName}</Typography>
        </Box>
        <IconButton onClick={onClose} aria-label="Close" sx={{ flexShrink: 0 }}><CloseIcon /></IconButton>
      </Stack>

      <Stack spacing={1.5} sx={{ flex: 1, overflowY: 'auto', p: 1.5, bgcolor: 'action.hover' }}>
        {messages.length === 0 && (
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary">Ask anything about this lead. Try:</Typography>
            {SUGGESTIONS.map((s) => (
              <Box key={s} onClick={() => send(s)} sx={{ cursor: 'pointer', bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 1, px: 1.25, py: 0.75, fontSize: 13 }}>
                {s}
              </Box>
            ))}
          </Stack>
        )}
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <Stack key={m.id} direction={isUser ? 'row-reverse' : 'row'} spacing={1} alignItems="flex-start">
              <Avatar sx={{ width: 26, height: 26, bgcolor: isUser ? 'primary.main' : 'secondary.main' }}>
                {isUser ? <PersonIcon sx={{ fontSize: 16 }} /> : <SmartToyIcon sx={{ fontSize: 16 }} />}
              </Avatar>
              <Box sx={{ maxWidth: '82%' }}>
                {isUser ? (
                  <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', borderRadius: 2, px: 1.5, py: 1, whiteSpace: 'pre-wrap' }}>
                    <Typography variant="body2">{m.content}</Typography>
                  </Box>
                ) : (
                  <Box sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2 }}>
                    <RichTextField value={m.content} onChange={() => {}} readOnly bare />
                  </Box>
                )}
              </Box>
            </Stack>
          );
        })}
        {loading && <Stack direction="row" spacing={1} alignItems="center"><CircularProgress size={16} /><Typography variant="caption" color="text.secondary">Thinking…</Typography></Stack>}
        {error && <Typography variant="caption" color="error">{error}</Typography>}
        <div ref={endRef} />
      </Stack>

      <Stack direction="row" spacing={1} alignItems="flex-end" sx={{ p: 1.5, borderTop: 1, borderColor: 'divider' }}>
        <TextField
          size="small"
          fullWidth
          multiline
          maxRows={4}
          placeholder="Ask about this lead…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
        />
        <IconButton color="primary" onClick={() => send(input)} disabled={loading || !input.trim()} aria-label="Send">
          <SendIcon />
        </IconButton>
      </Stack>
    </Drawer>
  );
}
