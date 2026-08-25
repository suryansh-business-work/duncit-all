import { Box, Stack, Typography } from '@mui/material';
import ClubAdminCard from '../pod-pending-page/ClubAdminCard';
import { useTranslation } from '../../i18n/useTranslation';

/** A `ClubActor` off the club query, admin flavour — carries the contact
 * details the server lifts from the admin's profile. */
export interface ClubAdmin {
  id: string;
  name: string;
  avatar_url?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
}

/** The people who run this club and how to reach them — name, email, phone and
 * WhatsApp, straight off each admin's profile. Renders the same contact card
 * the host's waiting page uses (native twin: ClubAdminsSection, rule 27). */
export default function ClubAdminsSection({ admins }: Readonly<{ admins: ClubAdmin[] }>) {
  const { t } = useTranslation();
  if (admins.length === 0) return null;

  return (
    <Box data-testid="club-admins">
      <Typography variant="h6" gutterBottom sx={{
        fontWeight: 700
      }}>
        Club Admins
      </Typography>
      <Stack spacing={1.5}>
        {admins.map((admin) => (
          <ClubAdminCard
            key={admin.id}
            caption={t('mweb.common.contactTheClubAdmin')}
            admin={{
              name: admin.name,
              profile_photo: admin.avatar_url,
              email: admin.email,
              phone: admin.phone,
              whatsapp: admin.whatsapp,
            }}
          />
        ))}
      </Stack>
    </Box>
  );
}
