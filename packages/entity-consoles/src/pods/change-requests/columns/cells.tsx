import { Stack, Typography } from '@mui/material';
import { formatDateCell } from '@duncit/table';
import type { PodChangeRow } from '@duncit/utils';
import type { Translate } from './types';

/** Who asked, with the contacts an admin needs to reach them. */
export function RequesterCell({ row }: Readonly<{ row: PodChangeRow }>) {
  const who = row.requested_by;
  const context = row.role === 'VENUE' ? row.from_venue_name : row.from_club_name;
  return (
    <Stack component="span" sx={{ lineHeight: 1.25, py: 0.5 }}>
      <Typography variant="body2" component="span" sx={{ fontWeight: 700 }}>
        {who.full_name || who.email || '—'}
      </Typography>
      {context && (
        <Typography variant="caption" component="span" sx={{ color: 'text.secondary' }}>
          {context}
        </Typography>
      )}
      <Typography variant="caption" component="span" sx={{ color: 'text.secondary' }}>
        {[who.phone, who.email].filter(Boolean).join(' · ') || '—'}
      </Typography>
    </Stack>
  );
}

/** The pod, with the state it is in — a cancelled pod is not offerable. */
export function PodCell({ row, t }: Readonly<{ row: PodChangeRow; t: Translate }>) {
  return (
    <Stack component="span" sx={{ lineHeight: 1.25, py: 0.5 }}>
      <Typography variant="body2" component="span" sx={{ fontWeight: 700 }}>
        {row.pod.pod_title}
      </Typography>
      <Typography variant="caption" component="span" sx={{ color: 'text.secondary' }}>
        {formatDateCell(row.pod.pod_date_time)}
      </Typography>
      {row.pod_cancelled && (
        <Typography variant="caption" component="span" sx={{ color: 'error.main', fontWeight: 700 }}>
          {t('changeRequest.resolvedCancelled')}
        </Typography>
      )}
    </Stack>
  );
}
