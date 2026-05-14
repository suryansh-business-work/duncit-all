import { useState } from 'react';
import { gql, useMutation } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fab,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';

const ADMIN_AI_CHAT = gql`
  mutation AdminAiChat($prompt: String!) {
    adminAiChat(prompt: $prompt)
  }
`;

export default function AdminAiChatButton() {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [answer, setAnswer] = useState('');
  const [run, { loading, error }] = useMutation(ADMIN_AI_CHAT);

  const ask = async () => {
    const text = prompt.trim();
    if (!text) return;
    const res = await run({ variables: { prompt: text } });
    setAnswer(res.data?.adminAiChat ?? '');
  };

  return (
    <>
      <Fab
        color="primary"
        aria-label="Open AI admin chat"
        onClick={() => setOpen(true)}
        sx={{ position: 'fixed', right: 24, bottom: 24, zIndex: 1300 }}
      >
        <SmartToyIcon />
      </Fab>
      <Dialog open={open} onClose={() => !loading && setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Admin AI Chat</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              label="Ask about users, links or admin tasks"
              placeholder="Find the profile link for phone 9876543210"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              multiline
              minRows={3}
              fullWidth
            />
            {error && <Alert severity="error">{error.message}</Alert>}
            {answer && (
              <Box sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{answer}</Typography>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={loading}>Close</Button>
          <Button variant="contained" onClick={ask} disabled={loading || !prompt.trim()}>
            {loading ? 'Asking...' : 'Ask'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}