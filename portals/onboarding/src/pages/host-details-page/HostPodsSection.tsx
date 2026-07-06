import {
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { HostPod } from '../hosts-page/queries';

interface Props {
  title: string;
  emptyLabel: string;
  pods: HostPod[];
  formatDateTime: (input: string | null | undefined) => string;
}

/** A titled table of a host's pods for one time bucket (Upcoming / Current /
 * Hosted). Presentational — the container buckets the pods and passes them in. */
export default function HostPodsSection({ title, emptyLabel, pods, formatDateTime }: Readonly<Props>) {
  return (
    <Stack spacing={1}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography variant="subtitle1" fontWeight={800}>{title}</Typography>
        <Chip size="small" label={pods.length} />
      </Stack>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Pod</TableCell>
            <TableCell>Date &amp; time</TableCell>
            <TableCell>Mode</TableCell>
            <TableCell align="right">Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {pods.map((pod) => (
            <TableRow key={pod.id} hover>
              <TableCell>
                <Typography variant="body2" fontWeight={700}>{pod.pod_title}</Typography>
                <Typography variant="caption" color="text.secondary">{pod.club_slug || '—'}</Typography>
              </TableCell>
              <TableCell>{formatDateTime(pod.pod_date_time) || '—'}</TableCell>
              <TableCell><Chip size="small" variant="outlined" label={pod.pod_mode} /></TableCell>
              <TableCell align="right">
                <Chip
                  size="small"
                  variant="outlined"
                  color={pod.is_active ? 'success' : 'default'}
                  label={pod.is_active ? 'Live' : 'Offline'}
                />
              </TableCell>
            </TableRow>
          ))}
          {pods.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} align="center">{emptyLabel}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Stack>
  );
}
