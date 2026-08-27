import { useNavigate } from 'react-router-dom';
import { gql, useQuery } from '@apollo/client';
import { Alert, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from '@mui/material';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import { DuncitButton } from '@duncit/buttons';
import ClubAdminCard from '../pod-pending-page/ClubAdminCard';
import { useTranslation } from '../../i18n/useTranslation';

/** A `ClubActor` in its admin flavour — the contact details the server lifts
 * from each assigned admin's profile. */
interface ClubAdmin {
  id: string;
  name: string;
  avatar_url?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
}

/** Read on demand, for one club — the host's pod list stays free of contact
 * details it would otherwise carry for every row. */
const POD_CLUB_ADMINS = gql`
  query PodClubAdmins($club_doc_id: ID!) {
    club(club_doc_id: $club_doc_id) {
      id
      club_admins {
        id
        name
        avatar_url
        email
        phone
        whatsapp
      }
    }
  }
`;

export interface PodClubAdminTarget {
  id: string;
  pod_title: string;
  club_id?: string | null;
}

/** "Pod Club Admin" — who runs the club this pod belongs to, and how to reach
 * them, plus a support ticket that carries the pod through. Native twin:
 * PodClubAdminSheet (rule 27). */
export default function PodClubAdminDialog({
  pod,
  onClose,
}: Readonly<{ pod: PodClubAdminTarget | null; onClose: () => void }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data, loading, error } = useQuery(POD_CLUB_ADMINS, {
    variables: { club_doc_id: pod?.club_id },
    skip: !pod?.club_id,
    fetchPolicy: 'cache-and-network',
  });
  const admins: ClubAdmin[] = data?.club?.club_admins ?? [];

  const openSupport = () => {
    if (!pod) return;
    const params = new URLSearchParams({ podId: pod.id, podTitle: pod.pod_title });
    onClose();
    navigate(`/support/tickets?${params.toString()}`);
  };

  let body;
  if (loading && !data) {
    body = (
      <Stack
        sx={{
          alignItems: "center",
          py: 4
        }}>
        <CircularProgress size={24} />
      </Stack>
    );
  } else if (error) {
    body = <Alert severity="error">{t('mweb.podClubAdmin.loadFailed')}</Alert>;
  } else if (admins.length === 0) {
    body = <Alert severity="info">{t('mweb.podClubAdmin.none')}</Alert>;
  } else {
    body = (
      <Stack spacing={1.5}>
        {admins.map((admin) => (
          <ClubAdminCard
            key={admin.id}
            caption={t('mweb.podClubAdmin.caption')}
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

  return (
    <Dialog open={!!pod} onClose={onClose} fullWidth maxWidth="xs" data-testid="pod-club-admin">
      <DialogTitle sx={{ fontWeight: 700 }}>{t('mweb.podClubAdmin.title')}</DialogTitle>
      <DialogContent dividers>{body}</DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose}>{t('mweb.podClubAdmin.close')}</DuncitButton>
        <DuncitButton
          variant="contained"
          startIcon={<SupportAgentIcon />}
          onClick={openSupport}
          data-testid="pod-club-admin-support"
        >
          {t('mweb.podClubAdmin.support')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
