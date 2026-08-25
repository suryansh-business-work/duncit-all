import { useState } from 'react';
import { Alert, AlertTitle, Box, Button, Collapse, Stack } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useTranslation } from '../i18n/useTranslation';
import type { Failure } from './failure';

interface Props {
  failure: Failure;
  onDismiss?: () => void;
}

/**
 * What went wrong, in both registers.
 *
 * The sentence at the top is for the person trying to make a call. The block
 * underneath is the whole throw — name, message, constraint, stack — for the
 * person who has to fix it, which is often the same person an hour later.
 * Hidden by default because a stack trace over a chat panel helps nobody, and
 * copyable in one press because the alternative is retyping it into a ticket.
 */
export default function FailureAlert({ failure, onDismiss }: Readonly<Props>) {
  const { t } = useTranslation();
  const [showing, setShowing] = useState(false);
  const [copied, setCopied] = useState(false);

  // `message` is a key when we raised it and a sentence when the browser did;
  // t() hands back anything it does not recognise, so one call covers both.
  const headline = t(failure.message);
  const hasDetail = failure.detail !== '' && failure.detail !== headline;

  const copy = () => {
    globalThis.navigator?.clipboard
      ?.writeText(failure.detail || headline)
      .then(() => setCopied(true))
      .catch(() => setCopied(false));
  };

  return (
    <Alert severity="error" onClose={onDismiss} sx={{ m: 1 }}>
      <AlertTitle sx={{ mb: hasDetail ? 0.5 : 0 }}>{headline}</AlertTitle>

      {hasDetail && (
        <Stack spacing={0.5} sx={{
          alignItems: "flex-start"
        }}>
          <Stack direction="row" spacing={1}>
            <Button size="small" color="inherit" onClick={() => setShowing((value) => !value)}>
              {showing ? t('shell.chat.failure.hideDetails') : t('shell.chat.failure.showDetails')}
            </Button>
            <Button size="small" color="inherit" startIcon={<ContentCopyIcon />} onClick={copy}>
              {copied ? t('shell.chat.failure.copied') : t('shell.chat.failure.copy')}
            </Button>
          </Stack>
          <Collapse in={showing} sx={{ width: '100%' }}>
            <Box
              component="pre"
              sx={{
                m: 0,
                p: 1,
                borderRadius: 1,
                bgcolor: 'action.hover',
                fontSize: 11,
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: 180,
                overflow: 'auto',
              }}
            >
              {failure.detail}
            </Box>
          </Collapse>
        </Stack>
      )}
    </Alert>
  );
}
