import { Box, Stack, Typography } from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { DuncitTabs, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import { useTranslation } from '@duncit/app-settings';
import ScenariosTab from './ScenariosTab';
import LogsTab from './LogsTab';

type WhatsappTab = 'scenarios' | 'logs';

/**
 * Admin > WhatsApp — every message Duncit sends on its own, with the switch
 * that stops it, and the record of what actually went out.
 */
export default function WhatsappPage() {
  const { t } = useTranslation();
  const items: DuncitTabItem<WhatsappTab>[] = [
    { value: 'scenarios', label: t('adminWhatsapp.tabScenarios') },
    { value: 'logs', label: t('adminWhatsapp.tabLogs') },
  ];
  const tabs = useTabParam<WhatsappTab>({ items, fallback: 'scenarios' });

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <WhatsAppIcon color="primary" />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" fontWeight={700}>
            {t('adminWhatsapp.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('adminWhatsapp.subtitle')}
          </Typography>
        </Box>
      </Stack>

      <DuncitTabs {...tabs} />

      {tabs.value === 'scenarios' ? <ScenariosTab /> : <LogsTab />}
    </Stack>
  );
}
