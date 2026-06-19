import { Alert, Box, Stack, Typography } from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';

/**
 * WhatsApp Lead Generator — connect a WhatsApp account via the OpenWA gateway
 * (portals/crm/open-wa-server, deployed at open-wa-server.duncit.com:2024), then
 * browse Communities / Groups / Users and import them as User Leads.
 *
 * Phase 1 scaffold: this turn wires the nav + route. The connect flow (API key +
 * QR + session), the Communities/Groups/Users browser, Mongo caching and lead
 * import arrive in the following phases.
 */
export default function WhatsAppLeadGeneratorPage() {
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 2 }}>
        <WhatsAppIcon sx={{ color: '#25D366' }} />
        <Typography variant="h5" fontWeight={800}>
          WhatsApp Lead Generator
        </Typography>
      </Stack>
      <Alert severity="info" sx={{ borderRadius: 2 }}>
        Connect a WhatsApp account through the OpenWA gateway to browse communities,
        groups and contacts, then import them as User Leads. The connect flow
        (API key + QR scan) and the data browser are being wired up next.
      </Alert>
    </Box>
  );
}
