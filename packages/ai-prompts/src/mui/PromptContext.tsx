import { Alert, Box, Chip, Divider, Stack, Tooltip, Typography } from '@mui/material';
import { usePromptCopy } from '../i18n/useCopy';
import { braced, exampleValues, renderPrompt } from '../render';
import type { AiPrompt, PromptKind, PromptVariable } from '../types';

/**
 * The read-only half of the editor: where a prompt runs, what it substitutes,
 * and what the model actually receives.
 *
 * This is the part that makes the library editable with any confidence. Without
 * it an operator is typing into a box with no idea which screen it affects or
 * what `{{pod_fields}}` will become, which is how a prompt gets "fixed" into
 * something that no longer works.
 */

interface VariablesProps {
  kind: PromptKind;
  variables: readonly PromptVariable[];
}

/**
 * Clicking a placeholder copies it. That is the repair path for the mistake
 * this panel exists to catch: an operator who deleted a required placeholder
 * mid-edit needs to put it back byte-for-byte, and retyping braces by hand is
 * exactly where the typo comes from.
 */
const copyPlaceholder = (text: string) => {
  globalThis.navigator?.clipboard?.writeText(text).catch(() => undefined);
};

export function PromptVariables({ kind, variables }: Readonly<VariablesProps>) {
  const copy = usePromptCopy();
  return (
    <Box>
      <Typography variant="subtitle2" sx={{
        fontWeight: 700
      }}>
        {copy.variablesTitle}
      </Typography>
      <Typography variant="caption" component="p" sx={{
        color: "text.secondary"
      }}>
        {kind === 'CODE' ? copy.variablesHintCode : copy.variablesHintAi}
      </Typography>
      {variables.length === 0 ? (
        <Typography
          variant="body2"
          sx={{
            color: "text.disabled",
            mt: 0.5
          }}>
          {copy.variablesEmpty}
        </Typography>
      ) : (
        <Stack spacing={0.75} sx={{ mt: 1 }}>
          {variables.map((v) => (
            <Stack key={v.name} direction="row" spacing={1} sx={{
              alignItems: "flex-start"
            }}>
              <Tooltip title={copy.copyVariable}>
                <Chip
                  size="small"
                  label={braced(v.name)}
                  color={v.required ? 'primary' : 'default'}
                  variant={v.required ? 'filled' : 'outlined'}
                  onClick={() => copyPlaceholder(braced(v.name))}
                  sx={{ fontFamily: 'monospace', flexShrink: 0 }}
                />
              </Tooltip>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{
                  fontWeight: 600
                }}>
                  {v.label}
                  {v.required && (
                    <Typography component="span" variant="caption" sx={{
                      color: "primary.main"
                    }}>
                      {' '}
                      · required
                    </Typography>
                  )}
                </Typography>
                {v.description && (
                  <Typography variant="caption" component="div" sx={{
                    color: "text.secondary"
                  }}>
                    {v.description}
                  </Typography>
                )}
              </Box>
            </Stack>
          ))}
        </Stack>
      )}
    </Box>
  );
}

/** Where a code prompt is wired in — file, surface and what a person did to fire it. */
export function PromptUsage({ usage }: Readonly<{ usage: AiPrompt['usage'] }>) {
  const copy = usePromptCopy();
  return (
    <Box>
      <Typography variant="subtitle2" sx={{
        fontWeight: 700
      }}>
        {copy.usageTitle}
      </Typography>
      {usage.length === 0 ? (
        <Typography variant="body2" sx={{
          color: "text.disabled"
        }}>
          {copy.usageEmpty}
        </Typography>
      ) : (
        <Stack spacing={1} sx={{ mt: 0.5 }}>
          {usage.map((u) => (
            <Box key={`${u.file}:${u.surface}`}>
              <Typography variant="body2" sx={{
                fontWeight: 600
              }}>
                {u.surface}
              </Typography>
              <Typography variant="caption" component="div" sx={{
                color: "text.secondary"
              }}>
                {u.trigger}
              </Typography>
              <Typography
                variant="caption"
                component="div"
                sx={{
                  fontFamily: "monospace",
                  color: "text.disabled",
                  wordBreak: 'break-all'
                }}>
                {u.file}
              </Typography>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}

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
