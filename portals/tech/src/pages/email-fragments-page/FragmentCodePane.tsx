import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import Editor from '@monaco-editor/react';
import { formatMjml } from '@duncit/utils';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';

interface Props {
  title: string;
  hint: string;
  value: string;
  onChange: (next: string) => void;
}

/**
 * One MJML editor. Used twice — header and footer — rather than written twice,
 * because the two differ only in their label.
 */
export default function FragmentCodePane({ title, hint, value, onChange }: Readonly<Props>) {
  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 160,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}
      >
        <Typography variant="subtitle2">{title}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
          {hint}
        </Typography>
        <Tooltip title="Format MJML">
          <IconButton size="small" onClick={() => onChange(formatMjml(value))}>
            <FormatAlignLeftIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <Editor
          height="100%"
          defaultLanguage="html"
          value={value}
          onChange={(v) => onChange(v ?? '')}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            tabSize: 2,
            wordWrap: 'on',
            automaticLayout: true,
          }}
        />
      </Box>
    </Box>
  );
}
