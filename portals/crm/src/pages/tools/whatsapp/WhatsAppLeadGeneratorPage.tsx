import { useCallback, type ReactNode } from 'react';
import { useQuery } from '@apollo/client/react';
import { Box, Stack, Typography } from '@mui/material';
import { QueryGuard } from '@duncit/ui';
import { logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { WA_CONNECTION, type WaConnection } from './whatsappQueries';
import WhatsAppConnectCard from './WhatsAppConnectCard';
import WhatsAppBrowser from './WhatsAppBrowser';
import WhatsAppApiKeyHelp from './WhatsAppApiKeyHelp';

/**
 * WhatsApp Lead Generator — links a WhatsApp account through the OpenWA gateway,
 * then browses Communities / Groups / Users and imports them as User Leads.
 * Opening the page starts the session and shows its QR (see useWaConnect).
 */
export default function WhatsAppLeadGeneratorPage() {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery<any>(WA_CONNECTION, {
    fetchPolicy: 'cache-and-network',
  });
  const connection: WaConnection | undefined = data?.waConnection;

  const handleChanged = useCallback(() => {
    refetch().catch((e: unknown) =>
      logs.portal['crm'].error('WhatsAppLeadGeneratorPage', 'handleChanged', {
        error: e,
        msg: 'waConnection refetch failed',
      }),
    );
  }, [refetch]);

  let body: ReactNode = null;
  if ((loading && !connection) || error) {
    body = <QueryGuard loading={loading && !connection} error={error} errorText={error?.message} />;
  } else if (connection) {
    body = (
      <Stack spacing={2}>
        <WhatsAppConnectCard connection={connection} onChanged={handleChanged} />
        {connection.status === 'CONNECTED' ? <WhatsAppBrowser /> : <WhatsAppApiKeyHelp />}
      </Stack>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 860, mx: 'auto' }}>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 2 }}>
        <WhatsAppIcon color="success" />
        <Typography component="h1" variant="h5" sx={{ fontWeight: 800 }}>
          {t('shell.nav.whatsappLeadGenerator')}
        </Typography>
      </Stack>

      {body}
    </Box>
  );
}
