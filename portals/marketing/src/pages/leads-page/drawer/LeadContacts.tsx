import { Link, Stack, Typography } from '@mui/material';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LanguageOutlinedIcon from '@mui/icons-material/LanguageOutlined';
import AlternateEmailOutlinedIcon from '@mui/icons-material/AlternateEmailOutlined';
import { useTranslation } from '@duncit/app-settings';
import type { MarketingLeadDetail } from '../queries';

interface Props {
  lead: MarketingLeadDetail;
}

const websiteHref = (website: string) => (/^https?:\/\//i.test(website) ? website : `https://${website}`);

/** How to reach the lead: each phone dials, each email opens mail, the website and the handle open in a new tab. */
export default function LeadContacts({ lead }: Readonly<Props>) {
  const { t } = useTranslation();
  const empty = lead.phones.length === 0 && lead.emails.length === 0 && !lead.website && !lead.instagram_handle;
  return (
    <Stack spacing={0.5} data-testid="lead-contacts">
      <Typography variant="subtitle2">{t('marketing.leads.contactsTitle')}</Typography>
      {empty && (
        <Typography variant="body2" color="text.secondary">
          {t('marketing.leads.noContacts')}
        </Typography>
      )}
      {lead.phones.map((phone) => (
        <Stack key={phone} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <PhoneOutlinedIcon fontSize="small" />
          <Link href={`tel:+${phone}`} variant="body2">
            +{phone}
          </Link>
        </Stack>
      ))}
      {lead.emails.map((email) => (
        <Stack key={email} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <EmailOutlinedIcon fontSize="small" />
          <Link href={`mailto:${email}`} variant="body2">
            {email}
          </Link>
        </Stack>
      ))}
      {lead.website && (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <LanguageOutlinedIcon fontSize="small" />
          <Link href={websiteHref(lead.website)} target="_blank" rel="noopener noreferrer" variant="body2">
            {lead.website}
          </Link>
        </Stack>
      )}
      {lead.instagram_handle && (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <AlternateEmailOutlinedIcon fontSize="small" />
          <Link href={lead.instagram_url} target="_blank" rel="noopener noreferrer" variant="body2" title={t('marketing.leads.openInstagram')}>
            @{lead.instagram_handle}
          </Link>
        </Stack>
      )}
    </Stack>
  );
}
