import { Box, Typography } from '@mui/material';
import { usePromptCopy } from '../../i18n/useCopy';
import { exampleValues, renderPrompt } from '../../render';
import type { PromptVariable } from '../../types';

interface PreviewProps {
  content: string;
  variables: readonly PromptVariable[];
}

/** The prompt as the model receives it, with every placeholder filled in. */
export function PromptPreview({ content, variables }: Readonly<PreviewProps>) {
  const copy = usePromptCopy();
  return (
    <Box>
      <Typography variant="subtitle2" sx={{
        fontWeight: 700
      }}>
        {copy.previewTitle}
      </Typography>
      <Typography variant="caption" component="p" sx={{
        color: "text.secondary"
      }}>
        {copy.previewHint}
      </Typography>
      <Box
        component="pre"
        data-testid="prompt-preview"
        sx={{
          mt: 0.75,
          m: 0,
          p: 1.25,
          maxHeight: 260,
          overflow: 'auto',
          borderRadius: 1,
          bgcolor: 'action.hover',
          fontSize: 12,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {renderPrompt(content, exampleValues(variables))}
      </Box>
    </Box>
  );
}
