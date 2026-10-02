import { Box, Stack, Typography } from '@mui/material';
import { usePromptCopy } from '../../i18n/useCopy';
import type { AiPrompt } from '../../types';

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
          color: "text.secondary"
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
                  color: "text.secondary",
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
