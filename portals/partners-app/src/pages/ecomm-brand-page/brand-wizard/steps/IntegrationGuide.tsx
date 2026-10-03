import { Accordion, AccordionDetails, AccordionSummary, Box, IconButton, Stack, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { shiprocketWebhookUrl } from '../../../../config/integration-links';
import type { BrandIntegrationProvider } from '../../queries';
import { integrationGuide } from './integration-guide';

interface Props {
  provider: BrandIntegrationProvider;
  /** Open by default until the provider is connected. */
  defaultExpanded: boolean;
}

/** "How to connect": numbered steps, the vendor pages to open, and (ShipRocket) the webhook URL to paste. */
export default function IntegrationGuide({ provider, defaultExpanded }: Readonly<Props>) {
  const { t } = useTranslation();
  const guide = integrationGuide(t, provider);
  const id = `integration-guide-${provider.toLowerCase()}`;
  const newTab = t('partners.brandWizard.integration.opensInNewTab');
  const webhookUrl = provider === 'SHIPROCKET' ? shiprocketWebhookUrl() : null;

  const copyWebhook = async () => {
    if (!webhookUrl) return;
    try {
      await globalThis.navigator.clipboard.writeText(webhookUrl);
      notifySuccess(t('partners.brandWizard.integration.copied'));
    } catch (error) {
      notifyError(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <Accordion variant="outlined" disableGutters defaultExpanded={defaultExpanded} data-testid={id}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls={`${id}-body`} id={`${id}-header`}>
        <Typography variant="subtitle2">{t('partners.brandWizard.integration.guideTitle')}</Typography>
      </AccordionSummary>
      <AccordionDetails id={`${id}-body`}>
        <Stack spacing={1.5}>
          <Box component="ol" sx={{ m: 0, pl: 2.5, display: 'grid', gap: 0.75 }}>
            {guide.steps.map((step) => (
              <Typography key={step} component="li" variant="body2">
                {step}
              </Typography>
            ))}
          </Box>
          {webhookUrl && (
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', flexShrink: 0 }}>
                {t('partners.brandWizard.integration.webhookUrl')}
              </Typography>
              <Typography
                variant="body2"
                data-testid={`${id}-webhook`}
                sx={{ fontFamily: 'monospace', overflowWrap: 'anywhere', minWidth: 0 }}
              >
                {webhookUrl}
              </Typography>
              <IconButton size="small" aria-label={t('partners.brandWizard.integration.copy')} onClick={copyWebhook}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Stack>
          )}
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            {guide.links.map((link) => (
              <DuncitButton
                key={link.key}
                size="small"
                variant={link.key === 'openApi' ? 'contained' : 'outlined'}
                endIcon={<OpenInNewIcon fontSize="small" />}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${link.label} (${newTab})`}
                data-testid={`${id}-${link.key}`}
              >
                {link.label}
              </DuncitButton>
            ))}
          </Stack>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
