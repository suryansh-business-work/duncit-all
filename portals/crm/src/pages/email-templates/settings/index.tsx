import { useNavigate } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, Card, CircularProgress, Stack, Typography } from '@mui/material';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import { BackButton } from '@duncit/ui';
import { DuncitButton } from '@duncit/buttons';
import { DuncitTabs, tabPanelProps, useTabParam } from '@duncit/tabs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import { CRM_EMAIL_SETTINGS, type CrmEmailSettings } from '../../../api/emailSettings.gql';
import BrandAssetsPanel from './BrandAssetsPanel';
import ThemePanel from './ThemePanel';
import PromptsPanel from './PromptsPanel';
import { settingsTabs, type SettingsTab } from './settingsTabs';

/** CRM › Email Templates › Settings: brand library, theme and the AI writer's instructions. */
export default function EmailTemplateSettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const strip = useTabParam<SettingsTab>({ items: settingsTabs(t), fallback: 'assets' });
  const { data, loading, error, refetch } = useQuery<{ crmEmailSettings: CrmEmailSettings }>(CRM_EMAIL_SETTINGS, {
    fetchPolicy: 'cache-and-network',
  });
  const settings = data?.crmEmailSettings;

  const body = () => {
    if (strip.value === 'prompts') return <PromptsPanel />;
    if (loading && !settings) {
      return (
        <Stack sx={{ alignItems: 'center', py: 6 }}>
          <CircularProgress aria-label={t('crm.emailSettings.loading')} />
        </Stack>
      );
    }
    if (error || !settings) {
      return (
        <Alert
          severity="error"
          action={<DuncitButton size="small" onClick={() => refetch()}>{t('shell.common.retry')}</DuncitButton>}
        >
          {error ? parseApiError(error) : t('crm.emailSettings.loadFailed')}
        </Alert>
      );
    }
    return strip.value === 'theme' ? <ThemePanel settings={settings} /> : <BrandAssetsPanel settings={settings} />;
  };

  return (
    <Stack spacing={2.5}>
      <BackButton onClick={() => navigate('/email-templates')} sx={{ alignSelf: 'flex-start' }}>
        {t('crm.emailTemplates.backToTemplates')}
      </BackButton>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <SettingsSuggestIcon color="primary" />
        <Box>
          <Typography component="h1" variant="h5" sx={{ fontWeight: 800 }}>
            {t('crm.emailSettings.title')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('crm.emailSettings.subtitle')}
          </Typography>
        </Box>
      </Stack>
      <Card variant="outlined" sx={{ boxShadow: 'none' }}>
        <DuncitTabs
          {...strip}
          idPrefix="email-settings"
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
        />
      </Card>
      <Box {...tabPanelProps('email-settings', strip.value)}>{body()}</Box>
    </Stack>
  );
}
