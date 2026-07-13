import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

const GATEWAY = 'https://open-wa-server.duncit.com';

function Step({ n, children }: Readonly<{ n: number; children: React.ReactNode }>) {
  return (
    <Stack direction="row" spacing={1.25} alignItems="flex-start">
      <Box
        sx={{
          flex: '0 0 22px',
          height: 22,
          borderRadius: '50%',
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          display: 'grid',
          placeItems: 'center',
          fontSize: 12,
          fontWeight: 800,
          mt: 0.25,
        }}
      >
        {n}
      </Box>
      <Typography variant="body2" color="text.secondary">
        {children}
      </Typography>
    </Stack>
  );
}

/** How to obtain the OpenWA gateway API key — shown inside the tool. */
export default function WhatsAppApiKeyHelp() {
  return (
    <Accordion variant="outlined" disableGutters sx={{ borderRadius: 3, '&:before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" spacing={1} alignItems="center">
          <HelpOutlineIcon fontSize="small" color="primary" />
          <Typography fontWeight={800}>How do I get the API key?</Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            The WhatsApp gateway runs at{' '}
            <Link href={GATEWAY} target="_blank" rel="noreferrer">
              {GATEWAY}
            </Link>
            . It authenticates every request with an <b>API key</b> (sent as the{' '}
            <code>X-API-Key</code> header). WhatsApp itself is linked later by scanning the QR — no
            WhatsApp password/token is ever needed.
          </Typography>

          <Typography variant="subtitle2" fontWeight={800}>
            Option A — use the master key (quickest)
          </Typography>
          <Step n={1}>
            Ask your DevOps/admin for the gateway’s master key — it’s the value of the{' '}
            <code>OPENWA_API_MASTER_KEY</code> deployment secret.
          </Step>
          <Step n={2}>Paste it into the “API Key” field above, then click <b>Save &amp; Connect</b>.</Step>

          <Typography variant="subtitle2" fontWeight={800} sx={{ pt: 1 }}>
            Option B — create a dedicated key
          </Typography>
          <Step n={1}>
            Open the gateway API docs:{' '}
            <Link href={`${GATEWAY}/api/docs`} target="_blank" rel="noreferrer">
              {GATEWAY}/api/docs
            </Link>
            .
          </Step>
          <Step n={2}>
            Click <b>Authorize</b> and enter the master key as the <code>X-API-Key</code>.
          </Step>
          <Step n={3}>
            Run <code>POST /api/auth/api-keys</code> (give it a name + ADMIN role) and{' '}
            <b>copy the returned key</b> — it’s shown only once.
          </Step>
          <Step n={4}>Paste that key above and <b>Save &amp; Connect</b>, then scan the QR.</Step>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
