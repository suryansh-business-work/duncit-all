import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PodRequestListRow from './PodRequestListRow';
import type { PodRequestRow } from './queries';

interface Props {
  requests: readonly PodRequestRow[];
  emptyText: string;
  onRespond?: (id: string, accept: boolean) => void;
  busy?: boolean;
}

/** A studio list of requests, or the line that says why it is empty. */
export default function PodRequestList({ requests, emptyText, onRespond, busy }: Readonly<Props>) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      {requests.length === 0 ? (
        <Typography sx={{ p: 3, color: 'text.secondary' }}>{emptyText}</Typography>
      ) : (
        <Stack divider={<Divider />}>
          {requests.map((request) => (
            <PodRequestListRow key={request.id} request={request} onRespond={onRespond} busy={busy} />
          ))}
        </Stack>
      )}
    </Card>
  );
}
