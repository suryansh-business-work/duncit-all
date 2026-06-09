import { Box, Button, FormHelperText, Stack, Typography } from '@mui/material';
import Editor from '@monaco-editor/react';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import MjmlAiButton from '../../../components/MjmlAiButton';
import { formatMjml } from '../../../utils/mjmlFormat';

interface Props {
  value: string;
  error: boolean;
  helperText: string;
  onChange: (value: string) => void;
  onVerify: () => void;
}

export default function CampaignMjmlEditor({ value, error, helperText, onChange, onVerify }: Readonly<Props>) {
  return (
    <Stack spacing={0.75}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} justifyContent="space-between">
        <Typography variant="subtitle2" fontWeight={700}>MJML body</Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button size="small" variant="outlined" startIcon={<FormatAlignLeftIcon />} onClick={() => onChange(formatMjml(value))}>Format</Button>
          <Button size="small" variant="outlined" startIcon={<FactCheckIcon />} onClick={onVerify}>Verify</Button>
          <MjmlAiButton currentMjml={value} onApply={onChange} />
        </Stack>
      </Stack>
      <Box
        sx={{
          height: 420,
          border: 1,
          borderColor: error ? 'error.main' : 'divider',
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        <Editor
          height="100%"
          defaultLanguage="html"
          value={value}
          onChange={(next) => onChange(next ?? '')}
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
      <FormHelperText error={error}>{helperText}</FormHelperText>
    </Stack>
  );
}