import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';
import { Avatar, Box, ButtonBase, Stack, Typography } from '@mui/material';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import { useDateFormat } from '../../../utils/dateFormat';
import { podRequestCounterpart } from '@duncit/utils';
import type { PodRequestRowData } from '../queries';
import PodRequestStatusChip from './PodRequestStatusChip';

interface Props {
  request: PodRequestRowData;
  /** Inline Accept / Decline on the Requests tab; nothing elsewhere. */
  actions?: ReactNode;
}

const CLAMP_SX = { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as const;

/**
 * One Pod Request in a studio list: the other party (photo, name, category,
 * place), the note, the date and the status. The row opens the request; the
 * actions sit beside the link, never inside it, so each is its own control.
 */
export default function PodRequestRow({ request, actions }: Readonly<Props>) {
  const fmt = useDateFormat();
  const other = podRequestCounterpart(request);
  return (
    <Stack spacing={1} sx={{ p: 2 }} data-testid={`pod-request-row-${request.id}`}>
      <ButtonBase
        component={RouterLink}
        to={`/pod-requests/${request.id}`}
        sx={{ display: 'flex', justifyContent: 'flex-start', textAlign: 'left', width: '100%', gap: 1.5 }}
        data-testid={`pod-request-open-${request.id}`}
      >
        <Avatar
          variant={other.kind === 'VENUE' ? 'rounded' : 'circular'}
          src={other.imageUrl || undefined}
          alt=""
          sx={{ width: 56, height: 56, bgcolor: 'action.hover', color: 'primary.main' }}
        >
          {other.kind === 'VENUE' ? <StorefrontRoundedIcon /> : <PersonRoundedIcon />}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
            {other.name}
          </Typography>
          {other.subtitle && (
            <Typography variant="body2" noWrap sx={{ color: 'text.secondary' }}>
              {other.subtitle}
            </Typography>
          )}
          {request.note && (
            <Typography variant="body2" sx={{ mt: 0.5, ...CLAMP_SX }}>
              {request.note}
            </Typography>
          )}
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {fmt.formatDate(request.created_at)}
          </Typography>
        </Box>
        <PodRequestStatusChip status={request.status} />
      </ButtonBase>
      {actions}
    </Stack>
  );
}
