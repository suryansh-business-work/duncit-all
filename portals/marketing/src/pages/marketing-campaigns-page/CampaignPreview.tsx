import { Alert, Box, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material';
import CampaignHtmlFrame from './CampaignHtmlFrame';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  html: string;
  errors: string[];
  loading: boolean;
  subject?: string;
}

export default function CampaignPreview({ html, errors, loading, subject }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>{t('marketing.marketingCampaigns.livePreview')}</Typography>
            <Typography variant="caption" color="text.secondary">{subject || 'Subject preview'}</Typography>
          </Box>
          {loading && <CircularProgress size={20} />}
        </Stack>
        {errors.map((error) => <Alert key={error} severity="warning">{error}</Alert>)}
        <CampaignHtmlFrame
          html={html}
          title={t('marketing.marketingCampaigns.campaignPreview')}
          placeholder={t('marketing.marketingCampaigns.previewWillAppearHere')}
        />
      </CardContent>
    </Card>
  );
}