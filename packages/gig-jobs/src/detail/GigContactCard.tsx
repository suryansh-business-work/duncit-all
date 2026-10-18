import { Card, CardContent, Stack, Typography } from '@mui/material';
import CallOutlinedIcon from '@mui/icons-material/CallOutlined';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { gigContactLinks, type GigContact } from '@duncit/utils';
import ContactSharingNotice from '../ContactSharingNotice';

interface Props {
  contact: GigContact;
  /** Heading override — the poster sees a freelancer's card under their name. */
  title?: string;
}

/** A shared contact with one-tap call, WhatsApp and mail, and the free-for-now notice. */
export default function GigContactCard({ contact, title }: Readonly<Props>) {
  const { t } = useTranslation();
  const links = gigContactLinks(contact);

  return (
    <Card variant="outlined" data-testid="gig-contact">
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="subtitle2" component="h2">
            {title ?? t('gigJobs.contact.title')}
          </Typography>
          <Stack spacing={0.25}>
            <Typography variant="body1">{contact.name}</Typography>
            {contact.phone && <Typography variant="body2">{contact.phone}</Typography>}
            {contact.email && <Typography variant="body2">{contact.email}</Typography>}
          </Stack>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
            {links.call && (
              <DuncitButton size="small" variant="outlined" startIcon={<CallOutlinedIcon />} href={links.call}>
                {t('gigJobs.contact.call')}
              </DuncitButton>
            )}
            {links.whatsapp && (
              <DuncitButton
                size="small"
                variant="outlined"
                startIcon={<WhatsAppIcon />}
                href={links.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('gigJobs.contact.whatsapp')}
              </DuncitButton>
            )}
            {links.email && (
              <DuncitButton size="small" variant="outlined" startIcon={<EmailOutlinedIcon />} href={links.email}>
                {t('gigJobs.contact.email')}
              </DuncitButton>
            )}
          </Stack>
          <ContactSharingNotice />
        </Stack>
      </CardContent>
    </Card>
  );
}
