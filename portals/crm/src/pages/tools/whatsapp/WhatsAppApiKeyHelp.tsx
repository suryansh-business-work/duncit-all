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
import HelpOutlineIcon from '@mui/icons-material/HelpOutlined';
import { useTranslation } from '@duncit/shell';

const GATEWAY = 'https://open-wa-server.duncit.com';

function Step({ n, children }: Readonly<{ n: number; children: React.ReactNode }>) {
  return (
    <Stack direction="row" spacing={1.25} sx={{
      alignItems: "flex-start"
    }}>
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
      <Typography variant="body2" sx={{
        color: "text.secondary"
      }}>
        {children}
      </Typography>
    </Stack>
  );
}

/** How to obtain the OpenWA gateway API key — shown inside the tool. */
export default function WhatsAppApiKeyHelp() {
  const { t } = useTranslation();
  return (
    <Accordion variant="outlined" disableGutters sx={{ borderRadius: 3, '&:before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" spacing={1} sx={{
          alignItems: "center"
        }}>
          <HelpOutlineIcon fontSize="small" color="primary" />
          <Typography sx={{
            fontWeight: 800
          }}>{t('crm.tools.howDoIGetTheApi')}</Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1.5}>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            The WhatsApp gateway runs at{' '}
            <Link href={GATEWAY} target="_blank" rel="noreferrer">
              {GATEWAY}
            </Link>
            . It authenticates every request with an <b>{t('crm.tools.apiKey')}</b> (sent as the{' '}
            <code>X-API-Key</code> header). WhatsApp itself is linked later by scanning the QR — no
            WhatsApp password/token is ever needed.
          </Typography>

          <Typography variant="subtitle2" sx={{
            fontWeight: 800
          }}>
            Option A — use the master key (quickest)
          </Typography>
          <Step n={1}>
            Ask your DevOps/admin for the gateway’s master key — it’s the value of the{' '}
            <code>OPENWA_API_MASTER_KEY</code> deployment secret.
          </Step>
          <Step n={2}>{t('crm.tools.pasteItIntoTheApiKey')} <b>{t('crm.tools.saveAndAmpConnect')}</b>.</Step>

          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 800,
              pt: 1
            }}>
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
            Click <b>{t('crm.tools.authorize')}</b> and enter the master key as the <code>X-API-Key</code>.
          </Step>
          <Step n={3}>
            Run <code>{t('crm.tools.postApiAuthApiKeys')}</code> (give it a name + ADMIN role) and{' '}
            <b>copy the returned key</b> — it’s shown only once.
          </Step>
          <Step n={4}>{t('crm.tools.pasteThatKeyAboveAnd')} <b>{t('crm.tools.saveAndAmpConnect')}</b>, then scan the QR.</Step>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
