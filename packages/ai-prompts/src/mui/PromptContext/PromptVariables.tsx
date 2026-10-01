import { Box, Chip, Stack, Tooltip, Typography } from '@mui/material';
import { usePromptCopy } from '../../i18n/useCopy';
import { braced } from '../../render';
import type { PromptKind, PromptVariable } from '../../types';

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
            color: "text.secondary",
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
              <Tooltip title={copy.copyVariable} describeChild>
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
