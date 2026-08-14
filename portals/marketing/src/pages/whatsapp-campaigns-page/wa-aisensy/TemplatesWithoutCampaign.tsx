import { Alert, AlertTitle, Button, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from '@duncit/app-settings';
import type { AisensyTemplate } from '../queries';
import { templateRowId } from './helpers';

interface Props {
  templates: AisensyTemplate[];
  onCreate: () => void;
}

/**
 * Approved templates nothing can send.
 *
 * Meta approving a template is the visible half of getting one live; binding a
 * campaign to it is the half nobody is told about, and a template sitting in
 * AiSensy without one looks finished from every screen except this one. Named
 * individually, because "seven of them" is not something anybody can act on.
 */
export default function TemplatesWithoutCampaign({ templates, onCreate }: Readonly<Props>) {
  const { t } = useTranslation();
  if (templates.length === 0) return null;

  return (
    <Alert
      severity="warning"
      action={
        <Button size="small" startIcon={<AddIcon />} onClick={onCreate}>
          {t('marketingWhatsapp.createCampaign')}
        </Button>
      }
    >
      <AlertTitle>{t('marketingWhatsapp.needsCampaignTitle')}</AlertTitle>
      <Typography variant="body2">{t('marketingWhatsapp.needsCampaignBody')}</Typography>
      <Stack component="ul" spacing={0.25} sx={{ m: 0, mt: 1, pl: 2.5 }}>
        {templates.map((template) => (
          <Typography key={templateRowId(template)} component="li" variant="body2" fontWeight={700}>
            {template.name}
          </Typography>
        ))}
      </Stack>
    </Alert>
  );
}
