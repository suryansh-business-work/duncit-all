import type { ReactNode } from 'react';
import { useQuery } from '@apollo/client';
import { Box, Stack, Typography } from '@mui/material';
import { QueryGuard } from '@duncit/ui';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { WA_CONNECTION, type WaConnection } from './whatsappQueries';
import WhatsAppConnectCard from './WhatsAppConnectCard';
import WhatsAppBrowser from './WhatsAppBrowser';
import WhatsAppApiKeyHelp from './WhatsAppApiKeyHelp';

/**
 * WhatsApp Lead Generator — connect a WhatsApp account through the OpenWA gateway
 * (open-wa-server.duncit.com), then browse Communities / Groups / Users and
 * import them as User Leads.
 *
 * P3 (this slice): the connect flow (API key + QR + session). The
 * Communities/Groups/Users browser + import lands in the next phase, shown once a
 * session is CONNECTED.
 */
export default function WhatsAppLeadGeneratorPage() {
  const { data, loading, error, refetch } = useQuery(WA_CONNECTION, {
    fetchPolicy: 'cache-and-network',
  });
  const connection: WaConnection | undefined = data?.waConnection;

  const handleChanged = () => {
    refetch().catch((e: unknown) => console.error('waConnection refetch failed', e));
  };

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
      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 2 }}>
        <WhatsAppIcon sx={{ color: '#25D366' }} />
        <Typography variant="h5" fontWeight={800}>
          WhatsApp Lead Generator
        </Typography>
      </Stack>

      {body}
    </Box>
  );
}
