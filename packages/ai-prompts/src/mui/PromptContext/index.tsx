import { Alert, Divider, Stack } from '@mui/material';
import { usePromptCopy } from '../../i18n/useCopy';
import type { AiPrompt } from '../../types';
import { PromptPreview } from './PromptPreview';
import { PromptUsage } from './PromptUsage';
import { PromptVariables } from './PromptVariables';

/**
 * The read-only half of the editor: where a prompt runs, what it substitutes,
 * and what the model actually receives.
 *
 * This is the part that makes the library editable with any confidence. Without
 * it an operator is typing into a box with no idea which screen it affects or
 * what `{{pod_fields}}` will become, which is how a prompt gets "fixed" into
 * something that no longer works.
 */

export { PromptPreview, PromptUsage, PromptVariables };

/** The whole read-only column, in the order an operator reads it. */
export function PromptContext({
  prompt,
  content,
}: Readonly<{ prompt: AiPrompt; content: string }>) {
  const copy = usePromptCopy();
  return (
    <Stack spacing={1.5} divider={<Divider flexItem />}>
      {prompt.kind === 'CODE' && (
        <Alert severity="info" sx={{ py: 0.5 }}>
          {copy.roleHints[prompt.role]}
        </Alert>
      )}
      {prompt.kind === 'CODE' && <PromptUsage usage={prompt.usage} />}
      <PromptVariables kind={prompt.kind} variables={prompt.variables} />
      <PromptPreview content={content} variables={prompt.variables} />
    </Stack>
  );
}
