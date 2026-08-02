import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Avatar,
  Card,
  CardContent,
  Chip,
  Divider,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import { StatusChip } from '@duncit/ui';
import { POD_HOST_PROFILE, type AdminPodAttendeeRow } from './queries';

interface HostRowProps {
  userId: string;
  name: string;
  primary: boolean;
  contact?: AdminPodAttendeeRow;
}

/** One host line: contact from the attendee list plus the approved host
 * profile (host number + status) when one exists. */
function HostRow({ userId, name, primary, contact }: Readonly<HostRowProps>) {
  const navigate = useNavigate();
  const { data } = useQuery(POD_HOST_PROFILE, { variables: { user_id: userId } });
  const profile = data?.hostByUser;

  return (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Avatar src={contact?.profile_photo ?? undefined} sx={{ width: 36, height: 36 }}>
        {(name[0] ?? '?').toUpperCase()}
      </Avatar>
      <Stack sx={{ minWidth: 0, flex: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Link
            component="button"
            underline="hover"
            onClick={() => navigate(`/users/${userId}`)}
            sx={{ fontWeight: 800, textAlign: 'left' }}
          >
            {name}
          </Link>
          {primary && <Chip icon={<StarIcon />} label="Primary" size="small" color="primary" variant="outlined" />}
          {profile && <StatusChip status={profile.status} />}
        </Stack>
        <Typography variant="caption" color="text.secondary" noWrap>
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
  const hostIds: string[] = pod.pod_hosts_id ?? [];
  const hostNames: string[] = pod.host_names ?? [];
  const contactByUser = new Map(attendees.map((row) => [row.user_id, row]));

  return (
    <Card>
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <StarIcon color="primary" />
          <Typography variant="subtitle1" fontWeight={900}>
            Hosts
          </Typography>
        </Stack>
        <Divider sx={{ mb: 1.5 }} />
        {hostIds.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No hosts on this pod.
          </Typography>
        )}
        <Stack spacing={1.5}>
          {hostIds.map((id, index) => (
            <HostRow
              key={id}
              userId={id}
              // host_names drops unknown users, so it can misalign — prefer the
              // attendee row's name, which is keyed by user id.
              name={contactByUser.get(id)?.full_name ?? hostNames[index] ?? 'Host'}
              primary={index === 0}
              contact={contactByUser.get(id)}
            />
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
