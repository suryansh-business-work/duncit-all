import { useState } from 'react';
import { useTranslation } from '../i18n/useTranslation';
import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';

/**
 * A deliberately small highlighter.
 *
 * Not highlight.js: that is most of a megabyte before you subset it, and it
 * would ride into all seventeen portal bundles to colour the occasional snippet
 * someone pastes into a chat. These four token classes — comments, strings,
 * numbers, keywords — are what makes a snippet readable at a glance, and they
 * are the same four in every language anybody here pastes.
 *
 * One pass, alternation ordered so a keyword inside a string stays a string.
 */
const TOKENS =
  /(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/)|('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|\b(const|let|var|function|return|if|else|for|while|class|new|await|async|import|export|from|type|interface|public|private|select|from|where|join|insert|update|delete|def|end|null|true|false)\b/g;

const COLOR = ['text.disabled', 'success.main', 'warning.main', 'primary.main'] as const;

/** Split into coloured spans without ever rendering raw HTML. */
function paint(code: string) {
  const out: React.ReactNode[] = [];
  let last = 0;
  let match = TOKENS.exec(code);
  let key = 0;
  while (match !== null) {
    if (match.index > last) out.push(code.slice(last, match.index));
    // Which capture group matched decides the colour.
    const group = [1, 2, 3, 4].find((index) => match?.[index] !== undefined) ?? 0;
    out.push(
      <Box component="span" key={`t-${key++}`} sx={{ color: COLOR[group - 1] ?? 'inherit' }}>
        {match[0]}
      </Box>,
    );
    last = match.index + match[0].length;
    match = TOKENS.exec(code);
  }
  TOKENS.lastIndex = 0;
  if (last < code.length) out.push(code.slice(last));
  return out;
}

interface Props {
  code: string;
  language?: string;
}

/** A fenced block: the language, a copy button, and readable colour. */
export default function CodeBlock({ code, language }: Readonly<Props>) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copy = () => {
    globalThis.navigator.clipboard
      ?.writeText(code)
      .then(() => {
        setCopied(true);
        globalThis.setTimeout(() => setCopied(false), 1400);
      })
      .catch(() => undefined);
  };

  return (
    <Box
      sx={{
        my: 0.5,
        borderRadius: 1.5,
        overflow: 'hidden',
        border: 1,
        borderColor: 'divider',
        bgcolor: 'action.hover',
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 1, py: 0.25, borderBottom: 1, borderColor: 'divider' }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
          {language || 'code'}
        </Typography>
        <Tooltip title={copied ? 'Copied' : 'Copy'}>
          <IconButton size="small" onClick={copy} aria-label={t('shell.chat.actions.copyCode')}>
            {copied ? <CheckIcon sx={{ fontSize: 14 }} /> : <ContentCopyIcon sx={{ fontSize: 14 }} />}
          </IconButton>
        </Tooltip>
      </Stack>
      {/* Scrolls inside itself — a wide paste must never widen the bubble. */}
      <Box
        component="pre"
        sx={{
          m: 0,
          p: 1,
          overflowX: 'auto',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 12.5,
          lineHeight: 1.55,
        }}
      >
        <code>{paint(code)}</code>
      </Box>
    </Box>
  );
}
