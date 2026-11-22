import { useState } from 'react';
import { Stack, TextField } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { fireAndForget, logs } from '@duncit/logs';

interface Props {
  busy: boolean;
  /** Resolves false when the question failed and should go back in the box. */
  onSend: (text: string) => Promise<boolean>;
}

/** The question box. Enter sends, Shift+Enter adds a line. */
export default function AskAiComposer({ busy, onSend }: Readonly<Props>) {
  const { t } = useTranslation();
  const [input, setInput] = useState('');

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    const ok = await onSend(text);
    if (!ok) setInput(text);
  };

  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-end', flexShrink: 0, p: 1.5, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
      <TextField
        size="small"
        fullWidth
        multiline
        maxRows={4}
        placeholder={t('crm.components.askAboutThisLead')}
        slotProps={{ htmlInput: { 'aria-label': t('crm.components.askAboutThisLead'), maxLength: 4000 } }}
        data-testid="crm-ask-ai-input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            fireAndForget(send(), logs.portal.crm, 'AskAiComposer', 'send');
          }
        }}
      />
      <DuncitIconButton color="primary" onClick={() => fireAndForget(send(), logs.portal.crm, 'AskAiComposer', 'send')} disabled={busy || !input.trim()} aria-label={t('crm.components.send')}>
        <SendIcon />
      </DuncitIconButton>
    </Stack>
  );
}
