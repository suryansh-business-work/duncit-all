import { Box, Button, FormHelperText, Stack, Typography } from '@mui/material';
import Editor from '@monaco-editor/react';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import MjmlAiButton from '../../../components/MjmlAiButton';
import { formatMjml } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  value: string;
  error: boolean;
  helperText: string;
  onChange: (value: string) => void;
  onVerify: () => void;
}

export default function CampaignMjmlEditor({ value, error, helperText, onChange, onVerify }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={0.75}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{
          alignItems: { sm: 'center' },
          justifyContent: "space-between"
        }}>
        <Typography variant="subtitle2" sx={{
          fontWeight: 700
        }}>{t('marketing.marketingCampaigns.mjmlBody')}</Typography>
        <Stack direction="row" spacing={1} useFlexGap sx={{
          flexWrap: "wrap"
        }}>
          <Button size="small" variant="outlined" startIcon={<FormatAlignLeftIcon />} onClick={() => onChange(formatMjml(value))}>{t('marketing.marketingCampaigns.format')}</Button>
          <Button size="small" variant="outlined" startIcon={<FactCheckIcon />} onClick={onVerify}>{t('marketing.marketingCampaigns.verify')}</Button>
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