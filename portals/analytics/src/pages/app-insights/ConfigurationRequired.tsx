import { Alert, AlertTitle, Box, Stack, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useTranslation } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { FIELD_LABEL, STORE_LABEL } from './tabs';
import type { AppInsightIntegration } from './queries';

/**
 * What a tab shows while its store is not connected: which credentials are
 * missing and where to set them — never numbers. A dashboard of zeros would
 * read as "nobody installed the app", which is a claim nobody measured.
 */
function StoreSetup({ integration }: Readonly<{ integration: AppInsightIntegration }>) {
  const { t } = useTranslation();
  const store = t(STORE_LABEL[integration.store]);
  return (
    <Alert
      severity="warning"
      data-testid={`app-insights-config-${integration.store.toLowerCase().replaceAll('_', '-')}`}
      action={
        integration.setup_url ? (
          <DuncitButton
            size="small"
            variant="outlined"
            color="inherit"
            href={integration.setup_url}
            target="_blank"
            rel="noopener noreferrer"
            endIcon={<OpenInNewIcon fontSize="small" />}
          >
            {t('analytics.appInsights.config.open')}
          </DuncitButton>
        ) : undefined
      }
    >
      <AlertTitle>{t('analytics.appInsights.config.title', { vars: { store } })}</AlertTitle>
      <Stack spacing={1}>
        <Typography variant="body2">{t('analytics.appInsights.config.body', { vars: { store } })}</Typography>
        {integration.missing.length > 0 && (
          <Box component="ul" sx={{ m: 0, pl: 2.5 }} aria-label={t('analytics.appInsights.config.missing')}>
            {integration.missing.map((field) => (
              <li key={field}>
                <Typography variant="body2">{t(FIELD_LABEL[field] ?? field)}</Typography>
              </li>
            ))}
          </Box>
        )}
        {integration.problem && <Typography variant="body2">{integration.problem}</Typography>}
      </Stack>
    </Alert>
  );
}

export default function ConfigurationRequired({ integrations }: Readonly<{ integrations: readonly AppInsightIntegration[] }>) {
  return (
    <Stack spacing={2} data-testid="app-insights-config-required">
      {integrations.map((integration) => (
        <StoreSetup key={integration.store} integration={integration} />
      ))}
    </Stack>
  );
}
