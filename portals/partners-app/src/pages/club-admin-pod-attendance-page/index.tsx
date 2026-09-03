import { useParams } from 'react-router';
import { Stack } from '@mui/material';
import { BackButton } from '@duncit/ui';
import ClubAdminAttendanceSection from '../../components/ClubAdminAttendanceSection';
import { useTranslation } from '../../i18n';

/**
 * Club Admin > Clubs > Detail > ✅ > Mark Attendance —
 * `/club-admin/clubs/:clubId/pods/:id/attendance`.
 *
 * A route of its own rather than a dialog, for the same reason the host's page
 * is one: marking a roster is the task, not a step inside another form. It has
 * a URL a club admin can be sent, Back returns to the club's pod list, and a
 * reload keeps them on the pod they were working through.
 *
 * The board below the Back link is `ClubAdminAttendanceSection` — the same card
 * the pod details page renders in its footer, reading the same
 * `podAttendanceBoard` the host reads (rule 41). Nothing here decides what this
 * viewer may do: the server answers `viewer: CLUB_ADMIN` and gates every mark
 * on their membership of this pod's club, so a club admin who opens another
 * club's pod id gets FORBIDDEN whatever this route says.
 */
export default function ClubAdminPodAttendancePage() {
  const { t } = useTranslation();
  const { clubId = '', id = '' } = useParams();

  return (
    <Stack spacing={2}>
      <BackButton to={`/club-admin/clubs/${clubId}`} sx={{ alignSelf: 'flex-start' }}>
        {t('clubAdmin.pods.clubPods')}
      </BackButton>
      <ClubAdminAttendanceSection podId={id} />
    </Stack>
  );
}
