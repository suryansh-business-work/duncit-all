import { useCallback } from 'react';
import { useMutation } from '@apollo/client/react';
import { ReactTerminal, TerminalContextProvider } from 'react-terminal';
import { Box, Stack, Typography } from '@mui/material';
import TerminalIcon from '@mui/icons-material/Terminal';
import { TECH_EXEC, type TechExecResult } from '../server/queries';
import { useTranslation } from '@duncit/app-settings';
import TerminalSuggestions from './TerminalSuggestions';

/** Format a techExec result into the terminal's output text (stdout, then any
 * stderr, then a non-zero exit marker). */
export function formatExecResult(result: TechExecResult | undefined): string {
  if (!result) return '(no output)';
  const parts: string[] = [];
  if (result.stdout) parts.push(result.stdout);
  if (result.stderr) parts.push(result.stderr);
  if (result.exitCode !== 0) parts.push(`[exit ${result.exitCode}]`);
  return parts.join('\n').trimEnd() || '(no output)';
}

/** Server terminal — runs arbitrary shell commands in the API container via the
 * SUPER_ADMIN-only techExec mutation. Each command is a one-shot request (no
 * interactive/streaming commands); every invocation is audited server-side.
 *
 * The suggestion sidebar shares this page's executor rather than opening a
 * second one, so a picked command and a typed one are the same request, the
 * same audit line and the same transcript. */
export default function TerminalPage() {
  const { t } = useTranslation();
  const [runExec] = useMutation<{ techExec: TechExecResult }>(TECH_EXEC);

  const exec = useCallback(
    async (full: string): Promise<string> => {
      try {
        const res = await runExec({ variables: { command: full } });
        return formatExecResult(res.data?.techExec);
      } catch (e) {
        return e instanceof Error ? e.message : t('tech.server.commandFailed');
      }
    },
    [runExec, t],
  );

  const runCommand = async (command: string, commandArguments: string) => {
    const full = commandArguments ? `${command} ${commandArguments}` : command;
    const text = await exec(full);
    return <span style={{ whiteSpace: 'pre-wrap' }}>{text}</span>;
  };

  return (
    <Stack spacing={2} sx={{ height: '100%' }}>
      <Stack direction="row" spacing={1} sx={{
        alignItems: "center"
      }}>
        <TerminalIcon color="primary" />
        <Box>
          <Typography variant="h5" sx={{
            fontWeight: 800
          }}>
            {t('tech.terminal.title')}
          </Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {t('tech.terminal.subtitle')}
          </Typography>
        </Box>
      </Stack>
      <TerminalContextProvider>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{ flex: 1, minHeight: 0, alignItems: 'stretch' }}
        >
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              minHeight: 460,
              borderRadius: 2,
              overflow: 'hidden',
              border: 1,
              borderColor: 'divider',
            }}
          >
            <ReactTerminal
              prompt="$"
              theme="material-dark"
              defaultHandler={runCommand}
              welcomeMessage={t('tech.terminal.welcome')}
              errorMessage={t('tech.server.commandFailed')}
            />
          </Box>
          <TerminalSuggestions onExec={exec} />
        </Stack>
      </TerminalContextProvider>
    </Stack>
  );
}
