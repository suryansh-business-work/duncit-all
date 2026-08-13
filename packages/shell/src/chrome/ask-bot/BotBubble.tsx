import type { ReactNode } from 'react';
import Markdown from 'react-markdown';
import { Box, Paper, Typography } from '@mui/material';
import { AnswerLinks } from './AnswerLinks';
import type { BotMessage } from './useAskBot';

type MarkdownChildren = Readonly<{ children?: ReactNode }>;

/** Markdown renders to React elements, never to raw HTML — which matters when
 * the text came back from a language model. */
const MARKDOWN_COMPONENTS = {
  p: ({ children }: MarkdownChildren) => (
    <Typography variant="body2" sx={{ '& + &': { mt: 0.75 } }}>
      {children}
    </Typography>
  ),
  strong: ({ children }: MarkdownChildren) => (
    <Box component="span" sx={{ fontWeight: 700 }}>
      {children}
    </Box>
  ),
};

interface Props {
  message: BotMessage;
}

/**
 * One turn of the conversation.
 *
 * The person's question sits right and tinted, the bot's answer left and plain,
 * with its links underneath as buttons — the answer says which console and what
 * you can do, the buttons take you there.
 */
export function BotBubble({ message }: Readonly<Props>) {
  const mine = message.role === 'USER';
  return (
    <Box sx={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
      <Paper
        variant="outlined"
        sx={{
          maxWidth: mine ? '85%' : '100%',
          px: 1.5,
          py: 1,
          bgcolor: mine ? 'primary.main' : 'background.paper',
          color: mine ? 'primary.contrastText' : 'text.primary',
          borderColor: mine ? 'primary.main' : 'divider',
          '& ul, & ol': { my: 0.5, pl: 2.5 },
          '& li': { fontSize: '0.875rem' },
        }}
      >
        {mine ? (
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {message.content}
          </Typography>
        ) : (
          <Markdown components={MARKDOWN_COMPONENTS}>{message.content}</Markdown>
        )}
        {message.links && <AnswerLinks links={message.links} />}
      </Paper>
    </Box>
  );
}
