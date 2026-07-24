import { useMutation } from '@apollo/client';
import { ReactTerminal, TerminalContextProvider } from 'react-terminal';
import { Box, Stack, Typography } from '@mui/material';
import TerminalIcon from '@mui/icons-material/Terminal';
import { TECH_EXEC, type TechExecResult } from '../server/queries';

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
 * interactive/streaming commands); every invocation is audited server-side. */
export default function TerminalPage() {
  const [runExec] = useMutation<{ techExec: TechExecResult }>(TECH_EXEC);

  const runCommand = async (command: string, commandArguments: string) => {
    const full = commandArguments ? `${command} ${commandArguments}` : command;
    let text: string;
    try {
      const res = await runExec({ variables: { command: full } });
      text = formatExecResult(res.data?.techExec);
    } catch (e) {
      text = e instanceof Error ? e.message : 'Command failed';
    }
    return <span style={{ whiteSpace: 'pre-wrap' }}>{text}</span>;
  };

  return (
    <Stack spacing={2} sx={{ height: '100%' }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <TerminalIcon color="primary" />
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Server · Terminal
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Runs shell commands in the API container (SUPER_ADMIN only). Every command is audited.
          </Typography>
        </Box>
      </Stack>
      <Box
        sx={{
          flex: 1,
          minHeight: 460,
          borderRadius: 2,
          overflow: 'hidden',
          border: 1,
          borderColor: 'divider',
        }}
      >
        <TerminalContextProvider>
          <ReactTerminal
            prompt="$"
            theme="material-dark"
            defaultHandler={runCommand}
            welcomeMessage="Duncit server terminal — type a command and press Enter."
            errorMessage="Command failed"
          />
        </TerminalContextProvider>
      </Box>
    </Stack>
  );
}
