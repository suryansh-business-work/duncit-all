import { Box, Chip, Divider, Stack, Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { DuncitButton } from '@duncit/buttons';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import type { PromptDetail } from '../../detailTypes';
import { useDetailCopy } from '../../i18n/useDetailCopy';
import { PromptContext } from '../PromptContext';
import { useCopyText } from '../shared/useCopyText';
import { runInBackground } from '../../log';

interface Props {
  detail: PromptDetail;
  onCopied: () => void;
}

/** The whole prompt, its size, and where it runs — the first thing anyone opening it wants. */
export function OverviewPanel({ detail, onCopied }: Readonly<Props>) {
  const copy = useDetailCopy();
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const copyText = useCopyText();
  const { prompt } = detail;

  const copyPrompt = async () => {
    if (await copyText(prompt.content, copy.detail.copied)) onCopied();
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
        <Tooltip title={copy.detail.tokensHint}>
          <Chip color="primary" variant="outlined" label={copy.detail.tokens(prompt.token_count)} />
        </Tooltip>
        <Chip variant="outlined" label={copy.detail.hits(detail.total_hits)} />
        <Chip variant="outlined" label={copy.detail.model(prompt.target_model || t('ai.library.defaultModel'))} />
        <Chip variant="outlined" label={copy.detail.category(prompt.category)} />
        {prompt.updated_at && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {copy.detail.updated(formatDateTime(prompt.updated_at))}
          </Typography>
        )}
      </Stack>

      <Box>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle2" component="h3">
            {copy.detail.fullPrompt}
          </Typography>
          <DuncitButton size="small" startIcon={<ContentCopyIcon />} onClick={() => runInBackground(copyPrompt(), 'copyPrompt')}>
            {copy.detail.copyPrompt}
          </DuncitButton>
        </Stack>
        <Box
          component="pre"
          tabIndex={0}
          aria-label={copy.detail.fullPrompt}
          sx={{
            m: 0,
            p: 1.5,
            maxHeight: 360,
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
      </Box>

      <Divider />
      <PromptContext prompt={prompt} content={prompt.content} />
    </Stack>
  );
}
