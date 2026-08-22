import { useContext, useMemo, useState, type ReactNode } from 'react';
import { TerminalContext } from 'react-terminal';
import {
  Box,
  InputAdornment,
  List,
  ListSubheader,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useTranslation } from '@duncit/app-settings';
import TerminalSuggestionRow from './TerminalSuggestionRow';
import { TERMINAL_COMMAND_GROUPS } from './terminal-commands';

/** The prompt colour of the `material-dark` theme the terminal renders with, so
 * a command echoed from here is indistinguishable from one that was typed. */
const PROMPT_COLOR = '#42A5F5';

const COPIED_RESET_MS = 1500;

export interface TerminalSuggestionsProps {
  /** Runs the command and resolves with the text to print. Never rejects — a
   * failed command resolves with its stderr and exit code. */
  onExec(command: string): Promise<string>;
}

interface SuggestionRow {
  id: string;
  command: string;
  label: string;
  description: string;
}

function matchesSearch(row: SuggestionRow, needle: string): boolean {
  if (!needle) return true;
  return `${row.label} ${row.description} ${row.command}`.toLowerCase().includes(needle);
}

/**
 * The terminal's command sidebar: the paths, Docker calls and health checks an
 * operator reaches for, each with what it does and the exact command it runs.
 *
 * Clicking one executes it and writes both the prompt line and the output into
 * the terminal's own buffer, so the transcript reads the same whether a command
 * was typed or picked. The library exposes no way to prefill its input, and a
 * suggestion that only copied itself would leave the operator pasting anyway.
 */
export default function TerminalSuggestions({ onExec }: Readonly<TerminalSuggestionsProps>) {
  const { t } = useTranslation();
  const { setBufferedContent, appendCommandToHistory } = useContext(TerminalContext);
  const [search, setSearch] = useState('');
  const [running, setRunning] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const groups = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return TERMINAL_COMMAND_GROUPS.map((group) => ({
      id: group.id,
      title: t(group.titleKey),
      rows: group.commands
        .map((command) => ({
          id: command.id,
          command: command.command,
          label: t(command.labelKey),
          description: t(command.descriptionKey),
        }))
        .filter((row) => matchesSearch(row, needle)),
    })).filter((group) => group.rows.length > 0);
  }, [search, t]);

  const append = (node: ReactNode) => {
    setBufferedContent((previous) => (
      <>
        {previous}
        {node}
      </>
    ));
  };

  const execute = async (command: string) => {
    setRunning(command);
    appendCommandToHistory(command);
    append(
      <>
        <span style={{ color: PROMPT_COLOR }}>$ </span>
        <span>{command}</span>
        <br />
      </>,
    );
    const text = await onExec(command);
    append(
      <>
        <span style={{ whiteSpace: 'pre-wrap' }}>{text}</span>
        <br />
      </>,
    );
    setRunning(null);
  };

  const handleRun = (command: string) => {
    execute(command).catch(() => setRunning(null));
  };

  const handleCopy = (command: string) => {
    navigator.clipboard
      .writeText(command)
      .then(() => {
        setCopied(command);
        globalThis.setTimeout(() => setCopied(null), COPIED_RESET_MS);
      })
      .catch(() => setCopied(null));
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        width: { xs: '100%', md: 360 },
        maxHeight: { xs: 420, md: '100%' },
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle2" fontWeight={800}>
          {t('tech.terminal.suggestions')}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          {t('tech.terminal.suggestionsHint')}
        </Typography>
        <TextField
          fullWidth
          size="small"
          margin="dense"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('tech.terminal.search')}
          inputProps={{ 'aria-label': t('tech.terminal.search') }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {groups.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
            {t('tech.terminal.noMatches')}
          </Typography>
        ) : null}
        {groups.map((group) => (
          <List
            key={group.id}
            dense
            disablePadding
            subheader={<ListSubheader sx={{ fontWeight: 800 }}>{group.title}</ListSubheader>}
          >
            {group.rows.map((row) => (
              <TerminalSuggestionRow
                key={row.id}
                command={row.command}
                label={row.label}
                description={row.description}
                running={running === row.command}
                disabled={running !== null}
                copied={copied === row.command}
                copyLabel={t('tech.terminal.copy')}
                copiedLabel={t('tech.terminal.copied')}
                onRun={handleRun}
                onCopy={handleCopy}
              />
            ))}
          </List>
        ))}
      </Box>
    </Paper>
  );
}
