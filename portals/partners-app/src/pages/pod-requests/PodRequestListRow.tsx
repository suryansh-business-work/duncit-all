import { Link as RouterLink } from 'react-router';
import Avatar from '@mui/material/Avatar';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DuncitButton } from '@duncit/buttons';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import PodRequestStatusChip from './PodRequestStatusChip';
import type { PodRequestRow } from './queries';
import { podRequestPath } from './side';

interface Props {
  request: PodRequestRow;
  /** Inline Accept / Decline — the Requests tab only. */
  onRespond?: (id: string, accept: boolean) => void;
  busy?: boolean;
}

/** The other party: a venue owner sees the host, a host sees the venue. */
function counterpart(request: PodRequestRow) {
  if (request.viewer_side === 'VENUE') {
    return { name: request.host?.name ?? '', image: request.host?.photo_url ?? '', place: '' };
  }
  const venue = request.venue;
  const place = [venue?.locality, venue?.city].filter(Boolean).join(', ');
  return { name: venue?.venue_name ?? '', image: venue?.cover_image_url ?? '', place };
}

/** One request in a studio list; the name opens its detail page. */
export default function PodRequestListRow({ request, onRespond, busy = false }: Readonly<Props>) {
  const { t } = useTranslation();
  const fmt = useDateFormat();
  const other = counterpart(request);
  const venueName = request.viewer_side === 'VENUE' ? request.venue?.venue_name : '';

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      sx={{ p: 2, alignItems: { sm: 'center' } }}
      data-testid="pod-request-row"
    >
      <Stack direction="row" spacing={1.5} sx={{ flex: 1, minWidth: 0, alignItems: 'center' }}>
        <Avatar src={other.image || undefined} alt="" variant={request.viewer_side === 'VENUE' ? 'circular' : 'rounded'}>
          {other.name.charAt(0)}
        </Avatar>
        <Stack sx={{ minWidth: 0 }} spacing={0.25}>
          <Link
            component={RouterLink}
            to={podRequestPath(request.viewer_side, request.id)}
            underline="hover"
            sx={{ fontWeight: 700, color: 'text.primary' }}
          >
            {other.name}
          </Link>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {[venueName, other.place, t('podRequests.requestedOn', { vars: { date: fmt.formatDate(request.created_at) } })]
              .filter(Boolean)
              .join(' · ')}
          </Typography>
        </Stack>
      </Stack>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <PodRequestStatusChip status={request.status} />
        {onRespond && (
          <>
            <DuncitButton size="small" variant="contained" disabled={busy} onClick={() => onRespond(request.id, true)}>
              {t('podRequests.accept')}
            </DuncitButton>
            <DuncitButton size="small" color="error" disabled={busy} onClick={() => onRespond(request.id, false)}>
              {t('podRequests.decline')}
            </DuncitButton>
          </>
        )}
      </Stack>
    </Stack>
  );
}
