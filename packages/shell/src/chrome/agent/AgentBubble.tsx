import { Box, Paper, Typography } from '@mui/material';
import { AgentResults } from './AgentResults';
import type { AgentMessage } from './useAgent';

/**
 * One turn of the conversation.
 *
 * The person's instruction sits right and tinted, the agent's report left and
 * plain, with everything it created listed underneath. The agent's text is
 * rendered as plain text rather than markdown: it describes rows that now
 * exist, so it is a record rather than prose worth formatting.
 */
export function AgentBubble({ message }: Readonly<{ message: AgentMessage }>) {
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
        }}
      >
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {message.content}
        </Typography>
        {message.items ? <AgentResults items={message.items} /> : null}
      </Paper>
    </Box>
  );
}
