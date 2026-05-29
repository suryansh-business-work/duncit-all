import { Alert, Box, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material';

interface Props {
  html: string;
  errors: string[];
  loading: boolean;
  subject?: string;
}

export default function CampaignPreview({ html, errors, loading, subject }: Props) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>Live Preview</Typography>
            <Typography variant="caption" color="text.secondary">{subject || 'Subject preview'}</Typography>
          </Box>
          {loading && <CircularProgress size={20} />}
        </Stack>
        {errors.map((error) => <Alert key={error} severity="warning">{error}</Alert>)}
        <Box
          component="iframe"
          title="Campaign preview"
          srcDoc={html || '<div style="font-family:sans-serif;padding:24px;color:#6b7280">Preview will appear here.</div>'}
          sx={{
            flex: 1,
            width: '100%',
            minHeight: 520,
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            bgcolor: 'background.default',
          }}
        />
      </CardContent>
    </Card>
  );
}