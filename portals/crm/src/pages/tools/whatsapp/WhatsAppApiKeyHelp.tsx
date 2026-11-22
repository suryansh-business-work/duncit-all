import { Accordion, AccordionDetails, AccordionSummary, Box, Stack, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlined';
import { useTranslation } from '@duncit/shell';

function Step({ n, children }: Readonly<{ n: number; children: React.ReactNode }>) {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-start' }}>
      <Box
        aria-hidden
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
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {children}
      </Typography>
    </Stack>
  );
}

/** How the connection works — shown under the connect card until WhatsApp is linked. */
export default function WhatsAppApiKeyHelp() {
  const { t } = useTranslation();
  return (
    <Accordion variant="outlined" disableGutters sx={{ borderRadius: 3, '&:before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <HelpOutlineIcon fontSize="small" color="primary" />
          <Typography sx={{ fontWeight: 800 }}>{t('crm.tools.howDoIGetTheApi')}</Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Stack component="ol" spacing={1.5} sx={{ m: 0, p: 0, listStyle: 'none' }}>
          <li>
            <Step n={1}>{t('crm.tools.helpStepAutoKey')}</Step>
          </li>
          <li>
            <Step n={2}>{t('crm.tools.helpStepScan')}</Step>
          </li>
          <li>
            <Step n={3}>{t('crm.tools.helpStepStuck')}</Step>
          </li>
          <li>
            <Step n={4}>{t('crm.tools.helpStepAdvanced')}</Step>
          </li>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
