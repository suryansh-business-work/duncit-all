import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Avatar, Chip, Link, Stack, Typography } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import { StatusChip } from '@duncit/ui';
import SectionCard from './SectionCard';
import { type AdminPodAttendeeRow } from './queries';
import { usePodDetailsScope } from './scope';
import { useTranslation } from './i18n/useTranslation';

interface HostRowProps {
  userId: string;
  name: string;
  primary: boolean;
  contact?: AdminPodAttendeeRow;
  /** Threaded through because the club-admin host lookup is scoped to the pod:
   * a club admin may read the host running THEIR pod, not any host by id. */
  podId: string;
}

/** One host line: contact from the attendee list plus the approved host
 * profile (host number + status) when one exists. */
function HostRow({ userId, name, primary, contact, podId }: Readonly<HostRowProps>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const scopeDocs = usePodDetailsScope();
  const { data } = useQuery(scopeDocs.hostProfile, {
    variables: { user_id: userId, pod_id: podId },
  });
  const profile = data?.hostByUser;

  return (
    <Stack direction="row" spacing={1.5} sx={{
      alignItems: "center"
    }}>
      <Avatar src={contact?.profile_photo ?? undefined} sx={{ width: 36, height: 36 }}>
        {(name[0] ?? '?').toUpperCase()}
      </Avatar>
      <Stack sx={{ minWidth: 0, flex: 1 }}>
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{
            alignItems: "center",
            flexWrap: "wrap"
          }}>
          <Link
            component="button"
            underline="hover"
            onClick={() => navigate(`/users/${userId}`)}
            sx={{ fontWeight: 800, textAlign: 'left' }}
          >
            {name}
          </Link>
          {primary && <Chip icon={<StarIcon />} label={t('podDetailsPanel.podHostsCard.primary')} size="small" color="primary" variant="outlined" />}
          {profile && <StatusChip status={profile.status} />}
        </Stack>
        <Typography variant="caption" noWrap sx={{
          color: "text.secondary"
        }}>
          {[profile?.email ?? contact?.email, profile?.phone ?? contact?.phone, profile?.host_no]
            .filter(Boolean)
            .join(' · ') || 'No contact on file'}
        </Typography>
      </Stack>
    </Stack>
  );
}

interface Props {
  pod: any;
  attendees: AdminPodAttendeeRow[];
}

/** Host details — every host on the pod with contact info and host profile. */
export default function PodHostsCard({ pod, attendees }: Readonly<Props>) {
  const { t } = useTranslation();
  const hostIds: string[] = pod.pod_hosts_id ?? [];
  const hostNames: string[] = pod.host_names ?? [];
  const contactByUser = new Map(attendees.map((row) => [row.user_id, row]));

  return (
    <SectionCard
      icon={<StarIcon fontSize="small" />}
      title={t('podDetailsPanel.podHostsCard.hosts')}
      badge={hostIds.length > 0 ? hostIds.length : undefined}
      empty={hostIds.length === 0 ? 'No hosts on this pod.' : null}
    >
      <Stack spacing={2}>
        {hostIds.map((id, index) => (
          <HostRow
            key={id}
            userId={id}
            // host_names drops unknown users, so it can misalign — prefer the
            // attendee row's name, which is keyed by user id.
            name={contactByUser.get(id)?.full_name ?? hostNames[index] ?? 'Host'}
            primary={index === 0}
            contact={contactByUser.get(id)}
            podId={pod.id}
          />
        ))}
      </Stack>
    </SectionCard>
  );
}
