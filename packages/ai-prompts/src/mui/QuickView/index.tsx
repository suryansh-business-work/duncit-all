import { useEffect, useRef } from 'react';
import { Box, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import { DuncitButton } from '@duncit/buttons';
import type { AiPrompt } from '../../types';
import { useDetailCopy } from '../../i18n/useDetailCopy';
import { useCopyText } from '../shared/useCopyText';
import { usePromptEvent } from '../shared/usePromptEvent';
import { runInBackground } from '../../log';

export interface QuickViewDialogProps {
  prompt: AiPrompt | null;
  onClose: () => void;
  onOpenDetails: (prompt: AiPrompt) => void;
}

/**
 * A glance at one prompt without leaving the list: the text, its size, and a
 * copy button. Everything else is one click away in the detail view.
 */
export function QuickViewDialog({ prompt, onClose, onOpenDetails }: Readonly<QuickViewDialogProps>) {
  const copy = useDetailCopy();
  const copyText = useCopyText();
  const record = usePromptEvent();
  const titleId = 'ai-prompt-quick-view-title';

  // One count per opening, not per re-render.
  const countedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!prompt) {
      countedRef.current = null;
      return;
    }
    if (countedRef.current === prompt.id) return;
    countedRef.current = prompt.id;
    record(prompt.id, { type: 'QUICK_VIEW' });
  }, [prompt, record]);

  const copyPrompt = async (current: AiPrompt) => {
    if (await copyText(current.content, copy.detail.copied)) record(current.id, { type: 'COPY_PROMPT' });
  };

  return (
    <Dialog open={Boolean(prompt)} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby={titleId}>
      {prompt && (
        <>
          <DialogTitle id={titleId}>{prompt.name}</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={1.5}>
              <Box>
                <Chip size="small" color="primary" variant="outlined" label={copy.detail.tokens(prompt.token_count)} />
              </Box>
              <Box
                component="pre"
                aria-label={copy.detail.fullPrompt}
                sx={{
                  m: 0,
                  p: 1.5,
                  maxHeight: (theme) => theme.spacing(40),
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: 'monospace',
                  fontSize: (theme) => theme.typography.body2.fontSize,
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                }}
              >
                {prompt.content}
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions>
            <DuncitButton startIcon={<ContentCopyIcon />} onClick={() => runInBackground(copyPrompt(prompt), 'copyPrompt')}>
              {copy.detail.copyPrompt}
            </DuncitButton>
            <DuncitButton startIcon={<OpenInFullIcon />} onClick={() => onOpenDetails(prompt)}>
              {copy.actions.open}
            </DuncitButton>
            <DuncitButton variant="contained" onClick={onClose}>
              {copy.detail.close}
            </DuncitButton>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
