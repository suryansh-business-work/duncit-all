import { Avatar, Button, Card, Stack, Typography } from '@mui/material';
import CallIcon from '@mui/icons-material/Call';
import ChatIcon from '@mui/icons-material/Chat';
import EmailIcon from '@mui/icons-material/Email';
import PersonIcon from '@mui/icons-material/Person';
import PhoneIcon from '@mui/icons-material/Phone';
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
  caption = 'Need Help? Contact the Club Admin',
}: Readonly<{ admin: ClubAdminContact; caption?: string }>) {
  const waUrl = whatsappUrl(admin.whatsapp ?? '');

  // TODO(i18n) — row labels ship as literals until this feature is localized.
  const rows: InfoRowProps[] = [];
  if (admin.phone) {
    rows.push({
      icon: <PhoneIcon sx={ICON} />,
      label: 'Phone',
      value: admin.phone,
      testId: 'club-admin-phone',
    });
  }
  if (admin.whatsapp) {
    rows.push({
      icon: <ChatIcon sx={ICON} />,
      label: 'WhatsApp',
      value: admin.whatsapp,
      testId: 'club-admin-whatsapp',
    });
  }
  if (admin.email) {
    rows.push({
      icon: <EmailIcon sx={ICON} />,
      label: 'Email',
      value: admin.email,
      testId: 'club-admin-email',
    });
  }

  return (
    <Card variant="outlined" sx={{ p: 1.5, borderRadius: '16px' }} data-testid="club-admin-card">
      <Stack spacing={1.25}>
        <Typography variant="caption" fontWeight={600} color="text.secondary">
          {caption}
        </Typography>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Avatar
            src={admin.profile_photo ?? undefined}
            alt={admin.name}
            data-testid="club-admin-photo"
            sx={{ width: 44, height: 44 }}
          >
            <PersonIcon />
          </Avatar>
          <Typography variant="subtitle1" fontWeight={700} sx={{ minWidth: 0 }}>
            {admin.name}
          </Typography>
        </Stack>
        {rows.map((row) => (
          <InfoRow key={row.label} {...row} />
        ))}
        {/* TODO(i18n) — action labels ship as literals until this feature is localized. */}
        <Stack direction="row" spacing={2} flexWrap="wrap">
          {admin.phone && (
            <Button
              href={telUrl(admin.phone)}
              size="small"
              startIcon={<CallIcon />}
              data-testid="club-admin-call"
              sx={{ fontWeight: 600 }}
            >
              Call
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
              Message
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
              Email
            </Button>
          )}
        </Stack>
      </Stack>
    </Card>
  );
}
