import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { SEND_SLACK_MESSAGE, type SlackChannel } from './queries';

interface Result {
  ok: boolean;
  message: string;
}

/** Test-send composer: post text (optionally Block Kit blocks) to a channel, or
 * the configured default channel. Backs "mai code se kuch bhi bhej sakata hu". */
export default function SlackComposer({ channels }: Readonly<{ channels: SlackChannel[] }>) {
  const [channel, setChannel] = useState('');
  const [text, setText] = useState('');
  const [blocks, setBlocks] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [send, { loading }] = useMutation(SEND_SLACK_MESSAGE);

  const onSend = () => {
    const input = { channel: channel || undefined, text: text || undefined, blocks_json: blocks || undefined };
    send({ variables: { input } })
      .then((r) => setResult({ ok: true, message: `Sent — ts ${r.data?.sendSlackMessage?.ts ?? ''}` }))
      .catch((e) => setResult({ ok: false, message: e instanceof Error ? e.message : 'Send failed' }));
  };

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={900} sx={{ mb: 1 }}>
        Send a message
      </Typography>
      <Stack spacing={1.5}>
        <TextField
          select
          size="small"
          label="Channel"
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
        >
          <MenuItem value="">Default channel</MenuItem>
          {channels.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              #{c.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          label="Message"
          value={text}
          onChange={(e) => setText(e.target.value)}
          multiline
          minRows={2}
        />
        <TextField
          size="small"
          label="Block Kit blocks (JSON array, optional)"
          value={blocks}
          onChange={(e) => setBlocks(e.target.value)}
          multiline
          minRows={2}
          placeholder='[{"type":"section","text":{"type":"mrkdwn","text":"*Hi*"}}]'
        />
        {result && (
          <Alert severity={result.ok ? 'success' : 'error'} onClose={() => setResult(null)}>
            {result.message}
          </Alert>
        )}
        <Box>
          <Button
            variant="contained"
            disabled={loading || (!text.trim() && !blocks.trim())}
            onClick={onSend}
            sx={{ borderRadius: 999, fontWeight: 800 }}
          >
            Send
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}
