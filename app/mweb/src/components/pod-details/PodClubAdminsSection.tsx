import { Stack, Typography } from '@mui/material';
import ClubAdminCard from '../../pages/pod-pending-page/ClubAdminCard';
import type { ClubAdmin } from '../../pages/club-details-page/ClubAdminsSection';
import { useTranslation } from '../../i18n/useTranslation';

/** The people who run the club this pod belongs to, and how to reach them.
 *
 * Renders the same contact card the club page and the host's waiting page use,
 * so a number that is dialable in one place is dialable in all of them (native
 * twin: the `clubAdmins` section of PodAccordions, rule 27). */
export default function PodClubAdminsSection({ admins }: Readonly<{ admins: ClubAdmin[] }>) {
  const { t } = useTranslation();
  if (admins.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('mweb.podDetails.clubAdminsEmpty')}
      </Typography>
    );
  }

  return (
    <Stack spacing={1.5} data-testid="pod-club-admins">
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
  );
}
