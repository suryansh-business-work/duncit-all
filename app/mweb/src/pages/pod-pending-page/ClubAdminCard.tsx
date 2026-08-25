import { Avatar, Button, Card, Stack, Typography } from '@mui/material';
import CallIcon from '@mui/icons-material/Call';
import ChatIcon from '@mui/icons-material/Chat';
import EmailIcon from '@mui/icons-material/Email';
import PersonIcon from '@mui/icons-material/Person';
import PhoneIcon from '@mui/icons-material/Phone';
import { useTranslation } from '../../i18n/useTranslation';
import InfoRow, { type InfoRowProps } from './InfoRow';
import { mailtoUrl, telUrl, whatsappUrl } from './podPending';

/** The contact details a club admin is rendered from — satisfied both by the
 * pod-pending view's `club_admin` and by a club's `club_admins` entry. */
export interface ClubAdminContact {
  name: string;
  profile_photo?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
}

const ICON = { fontSize: 18 } as const;

/** "Need Help? Contact the Club Admin" card — profile, contact rows and
 * Call / Message (WhatsApp) / Email actions. Support availability is not
 * tracked anywhere in the system, so no such row is rendered (native twin,
 * rule 27). */
export default function ClubAdminCard({
  admin,
  caption,
}: Readonly<{ admin: ClubAdminContact; caption?: string }>) {
  const { t } = useTranslation();
  const waUrl = whatsappUrl(admin.whatsapp ?? '');

  const rows: InfoRowProps[] = [];
  if (admin.phone) {
    rows.push({
      icon: <PhoneIcon sx={ICON} />,
      label: t('mweb.podPending.phone'),
      value: admin.phone,
      testId: 'club-admin-phone',
    });
  }
  if (admin.whatsapp) {
    rows.push({
      icon: <ChatIcon sx={ICON} />,
      label: t('mweb.podPending.whatsapp'),
      value: admin.whatsapp,
      testId: 'club-admin-whatsapp',
    });
  }
  if (admin.email) {
    rows.push({
      icon: <EmailIcon sx={ICON} />,
      label: t('mweb.podPending.email'),
      value: admin.email,
      testId: 'club-admin-email',
    });
  }

  return (
    <Card variant="outlined" sx={{ p: 1.5, borderRadius: '16px' }} data-testid="club-admin-card">
      <Stack spacing={1.25}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            color: "text.secondary"
          }}>
          {caption ?? t('mweb.podPending.clubAdminCaption')}
        </Typography>
        <Stack direction="row" spacing={1.25} sx={{
          alignItems: "center"
        }}>
          <Avatar
            src={admin.profile_photo ?? undefined}
            alt={admin.name}
            data-testid="club-admin-photo"
            sx={{ width: 44, height: 44 }}
          >
            <PersonIcon />
          </Avatar>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 700,
              minWidth: 0
            }}>
            {admin.name}
          </Typography>
        </Stack>
        {rows.map((row) => (
          <InfoRow key={row.label} {...row} />
        ))}
        <Stack direction="row" spacing={2} sx={{
          flexWrap: "wrap"
        }}>
          {admin.phone && (
            <Button
              href={telUrl(admin.phone)}
              size="small"
              startIcon={<CallIcon />}
              data-testid="club-admin-call"
              sx={{ fontWeight: 600 }}
            >
              {t('mweb.podPending.actionCall')}
            </Button>
          )}
          {waUrl && (
            <Button
              href={waUrl}
              target="_blank"
              rel="noopener"
              size="small"
              startIcon={<ChatIcon />}
              data-testid="club-admin-message"
              sx={{ fontWeight: 600 }}
            >
              {t('mweb.podPending.actionMessage')}
            </Button>
          )}
          {admin.email && (
            <Button
              href={mailtoUrl(admin.email)}
              size="small"
              startIcon={<EmailIcon />}
              data-testid="club-admin-email-action"
              sx={{ fontWeight: 600 }}
            >
              {t('mweb.podPending.actionEmail')}
            </Button>
          )}
        </Stack>
      </Stack>
    </Card>
  );
}
