import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { WaConnection } from '../whatsappQueries';

interface Props {
  connection: WaConnection;
  busy: boolean;
  onDisconnect: () => void;
}

/** The linked-account summary shown once the session is CONNECTED. */
export default function ConnectedSummary({ connection, busy, onDisconnect }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent>
        <Stack direction="row" spacing={1.5} sx={{
          alignItems: "center"
        }}>
          <WhatsAppIcon sx={{ color: '#25D366' }} />
          <Box sx={{ flex: 1 }}>
            <Typography sx={{
              fontWeight: 800
            }}>{t('crm.tools.connected')}</Typography>
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              {connection.phone ? `+${connection.phone}` : 'WhatsApp account linked'}
            </Typography>
          </Box>
          <DuncitButton
            color="error"
            variant="outlined"
            disabled={busy}
            onClick={onDisconnect}
          >
            Disconnect
          </DuncitButton>
        </Stack>
      </CardContent>
    </Card>
  );
}
