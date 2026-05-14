import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import Editor from '@monaco-editor/react';
import CodeIcon from '@mui/icons-material/Code';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import MjmlAiButton from '../../components/MjmlAiButton';
import { formatMjml } from '../../utils/mjmlFormat';

interface Props {
  value: string;
  onChange: (next: string) => void;
  onValidate: () => void;
}

export default function MjmlEditorPane({ value, onChange, onValidate }: Props) {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
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
        <CodeIcon fontSize="small" />
        <Typography variant="subtitle2" sx={{ flex: 1 }}>
          MJML source
        </Typography>
        <Tooltip title="Format MJML">
          <IconButton size="small" onClick={() => onChange(formatMjml(value))}>
            <FormatAlignLeftIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Verify MJML">
          <IconButton size="small" onClick={onValidate}>
            <FactCheckIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <MjmlAiButton iconOnly currentMjml={value} onApply={onChange} />
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
            formatOnPaste: true,
            tabSize: 2,
            wordWrap: 'on',
            automaticLayout: true,
          }}
        />
      </Box>
    </Box>
  );
}
