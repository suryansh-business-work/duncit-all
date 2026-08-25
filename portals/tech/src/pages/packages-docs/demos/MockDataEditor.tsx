import { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Alert, Box, Button, Stack, Typography, useTheme } from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useTranslation } from '@duncit/app-settings';

const LINE_HEIGHT = 19;
const MAX_LINES = 24;
const MIN_LINES = 4;

interface Props {
  /** The demo's own mock — also the value Reset goes back to. */
  initial: unknown;
  /** Called with the parsed value on every edit that still parses. */
  onChange: (next: unknown) => void;
}

const toJson = (value: unknown) => JSON.stringify(value, null, 2);

/**
 * The demo's mock data, editable.
 *
 * The panel above renders whatever is in here, so this is the difference
 * between a screenshot and a sandbox: change a status, add a backout, push a
 * number past a threshold, and the component or the export answers for it in
 * front of you. Invalid JSON is reported and simply not applied — the last good
 * value keeps rendering rather than blanking the demo mid-keystroke.
 */
export default function MockDataEditor({ initial, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [text, setText] = useState(() => toJson(initial));
  const [error, setError] = useState('');

  // A new demo (or a new package) must reload its own mock, not keep the last.
  useEffect(() => {
    setText(toJson(initial));
    setError('');
  }, [initial]);

  const apply = (next: string) => {
    setText(next);
    try {
      onChange(JSON.parse(next));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('tech.packagesDocs.mockNotJson'));
    }
  };

  const lines = Math.min(MAX_LINES, Math.max(MIN_LINES, text.split('\n').length));

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} sx={{
        alignItems: "center"
      }}>
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            flex: 1
          }}>
          {t('tech.packagesDocs.mockHint')}
        </Typography>
        <Button
          size="small"
          startIcon={<RestartAltIcon fontSize="small" />}
          onClick={() => apply(toJson(initial))}
        >
          {t('tech.packagesDocs.resetMock')}
        </Button>
      </Stack>
      <Box sx={{ border: 1, borderColor: error ? 'error.main' : 'divider', borderRadius: 1, overflow: 'hidden' }}>
        <Box sx={{ height: lines * LINE_HEIGHT + 16 }}>
          <Editor
            height="100%"
            language="json"
            theme={theme.palette.mode === 'dark' ? 'vs-dark' : 'light'}
            value={text}
            onChange={(next) => apply(next ?? '')}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              renderLineHighlight: 'none',
              scrollbar: { alwaysConsumeMouseWheel: false },
            }}
          />
        </Box>
      </Box>
      {error && <Alert severity="warning" variant="outlined">{error}</Alert>}
    </Stack>
  );
}
