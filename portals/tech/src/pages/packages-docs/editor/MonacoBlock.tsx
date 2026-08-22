import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Box, Chip, IconButton, Stack, Tooltip, useTheme } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { copyToClipboard } from '@duncit/utils';
import { notifySuccess } from '@duncit/dialogs';
import CodeExpandDialog from './CodeExpandDialog';
import { useLazyVisible } from './useLazyVisible';

const LINE_HEIGHT = 19;
const CHROME = 16;
/** Tall enough to read a whole function, short enough that prose still flows. */
const MAX_LINES = 26;
const MIN_LINES = 3;

export interface MonacoBlockProps {
  code: string;
  /** Monaco mode id, e.g. `typescript`. */
  language: string;
  /** The fence tag as written, shown as the badge. */
  badge?: string;
  /** Read-only blocks still open in the editor; only editing is refused. */
  readOnly?: boolean;
}

const heightFor = (code: string) => {
  const lines = Math.min(MAX_LINES, Math.max(MIN_LINES, code.split('\n').length));
  return lines * LINE_HEIGHT + CHROME;
};

/**
 * One code block, as a real editor.
 *
 * Every fenced block in a package's docs is mounted here rather than printed as
 * a `<pre>`: a reader who wants to try a call signature can type into the block
 * that showed it, and the same editor is what the Expand button opens
 * full-screen. Edits are local to the page — the doc on disk is the source of
 * truth and nothing here writes to it.
 */
export default function MonacoBlock({
  code,
  language,
  badge,
  readOnly = false,
}: Readonly<MonacoBlockProps>) {
  const theme = useTheme();
  const { ref, visible } = useLazyVisible<HTMLDivElement>();
  const [value, setValue] = useState(code);
  const [expanded, setExpanded] = useState(false);
  const dirty = value !== code;

  const copy = async () => {
    await copyToClipboard(value);
    notifySuccess('Copied');
  };

  return (
    <Box
      ref={ref}
      sx={{
        my: 2,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'hidden',
        bgcolor: 'background.paper',
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.5}
        sx={{ px: 1, py: 0.5, borderBottom: 1, borderColor: 'divider' }}
      >
        {badge && (
          <Chip size="small" label={badge} sx={{ fontFamily: 'monospace', fontSize: 11 }} />
        )}
        <Box sx={{ flex: 1 }} />
        {dirty && (
          <Tooltip title="Back to the snippet as the docs write it">
            <IconButton size="small" onClick={() => setValue(code)} aria-label="Reset snippet">
              <RestartAltIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Copy">
          <IconButton size="small" onClick={copy} aria-label="Copy snippet">
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Open full screen">
          <IconButton size="small" onClick={() => setExpanded(true)} aria-label="Expand snippet">
            <OpenInFullIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      <Box sx={{ height: heightFor(code) }}>
        {visible ? (
          <Editor
            height="100%"
            language={language}
            theme={theme.palette.mode === 'dark' ? 'vs-dark' : 'light'}
            value={value}
            onChange={(next) => setValue(next ?? '')}
            options={{
              readOnly,
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: 'on',
              renderLineHighlight: 'none',
              scrollbar: { alwaysConsumeMouseWheel: false },
            }}
          />
        ) : (
          // Same height as the editor it becomes, so nothing jumps on mount.
          <Box
            component="pre"
            sx={{ m: 0, p: 1.5, fontSize: 13, lineHeight: 1.45, overflow: 'hidden' }}
          >
            {code}
          </Box>
        )}
      </Box>

      <CodeExpandDialog
        open={expanded}
        onClose={() => setExpanded(false)}
        value={value}
        onChange={setValue}
        language={language}
        title={badge || language}
      />
    </Box>
  );
}
