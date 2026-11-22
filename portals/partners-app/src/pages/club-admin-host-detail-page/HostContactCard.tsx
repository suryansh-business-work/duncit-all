import { Alert, AlertTitle, Card, CardContent, Stack, Typography } from '@mui/material';
import { ContactChips, contactLinks, usePodDetailsTranslation } from '@duncit/pod-details';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { ClubHostDetail } from './queries';

/** "Call / WhatsApp / Email" buttons on the warning, for the channels the host actually has. */
function ReachOutButtons({ host }: Readonly<{ host: ClubHostDetail }>) {
  const { t } = useTranslation();
  const { t: panelT } = usePodDetailsTranslation();
  const label = {
    phone: t('clubAdmin.hosts.call'),
    whatsapp: t('clubAdmin.hosts.whatsapp'),
    email: t('clubAdmin.hosts.email'),
  };
  return (
    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', mt: 1 }}>
      {contactLinks(host, panelT).map((link) => (
        <DuncitButton
          key={link.key}
          size="small"
          variant="contained"
          color="warning"
          startIcon={link.icon}
          href={link.href}
          target={link.external ? '_blank' : undefined}
          rel={link.external ? 'noopener' : undefined}
          data-testid={`club-host-reach-${link.key}`}
        >
          {label[link.key]}
        </DuncitButton>
      ))}
    </Stack>
  );
}

/**
 * Who the host is and how to reach them — and, when they have gone quiet for
 * longer than Pod Settings' inactivity window, a warning that asks the club
 * admin to get in touch, with the call / WhatsApp / email buttons right on it.
 */
export default function HostContactCard({ host }: Readonly<{ host: ClubHostDetail }>) {
  const { t } = useTranslation();
  const hasContact = Boolean(host.phone || host.whatsapp || host.email);
  const warnTitle = host.last_pod_at
    ? t('clubAdmin.hosts.warnTitle', { vars: { name: host.name, days: host.inactivity_days } })
    : t('clubAdmin.hosts.warnNever', { vars: { name: host.name } });

  return (
    <Stack spacing={2}>
      {host.is_inactive && (
        <Alert severity="warning" data-testid="club-host-inactive-warning">
          <AlertTitle>{warnTitle}</AlertTitle>
          {t('clubAdmin.hosts.warnBody')}
          {hasContact && <ReachOutButtons host={host} />}
        </Alert>
      )}
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1}>
            <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 800 }}>
              {t('clubAdmin.hosts.contactTitle')}
            </Typography>
            {hasContact ? (
              <ContactChips contact={host} testId="club-host-contact" />
            ) : (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t('clubAdmin.hosts.noContact')}
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
