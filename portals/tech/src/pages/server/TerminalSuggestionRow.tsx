import { Box, CircularProgress, ListItem, ListItemButton, ListItemText, Tooltip } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DoneIcon from '@mui/icons-material/Done';
import { DuncitIconButton } from '@duncit/buttons';

export interface TerminalSuggestionRowProps {
  command: string;
  label: string;
  description: string;
  /** This row is the one currently executing. */
  running: boolean;
  /** Some row is executing, so nothing else may be started. */
  disabled: boolean;
  copied: boolean;
  copyLabel: string;
  copiedLabel: string;
  onRun: (command: string) => void;
  onCopy: (command: string) => void;
}

/**
 * One suggestion: what it does, the exact command it will run, and a copy
 * button for the operator who would rather paste it and edit an argument.
 *
 * Hoisted to module scope rather than nested in the sidebar (rule 26a): a
 * component redefined on every render remounts each row on every keystroke of
 * the search box.
 */
export default function TerminalSuggestionRow({
  command,
  label,
  description,
  running,
  disabled,
  copied,
  copyLabel,
  copiedLabel,
  onRun,
  onCopy,
}: Readonly<TerminalSuggestionRowProps>) {
  const copyTitle = copied ? copiedLabel : copyLabel;
  const copyIcon = copied ? (
    <DoneIcon fontSize="small" color="success" />
  ) : (
    <ContentCopyIcon fontSize="small" />
  );

  const secondary = (
    <>
      <Box component="span" sx={{ display: 'block', color: 'text.secondary' }}>
        {description}
      </Box>
      <Box
        component="code"
        sx={{
          display: 'block',
          mt: 0.5,
          px: 0.75,
          py: 0.25,
          borderRadius: 1,
          bgcolor: 'action.hover',
          fontFamily: 'monospace',
          fontSize: 11,
          color: 'text.primary',
          overflowWrap: 'anywhere',
        }}
      >
        {command}
      </Box>
    </>
  );

  return (
    <ListItem
      disablePadding
      secondaryAction={
        <Tooltip title={copyTitle}>
          <DuncitIconButton edge="end" size="small" aria-label={copyTitle} onClick={() => onCopy(command)}>
            {copyIcon}
          </DuncitIconButton>
        </Tooltip>
      }
    >
      <ListItemButton
        disabled={disabled}
        onClick={() => onRun(command)}
        sx={{ alignItems: 'flex-start', pr: 6, py: 1 }}
      >
        <ListItemText
          primary={label}
          secondary={secondary}
          slotProps={{
            primary: { sx: { fontWeight: 600, fontSize: 13 } },
            secondary: { component: 'div', sx: { fontSize: 12 } }
          }} />
        {running ? <CircularProgress size={16} sx={{ mt: 0.5, ml: 1 }} /> : null}
      </ListItemButton>
    </ListItem>
  );
}
