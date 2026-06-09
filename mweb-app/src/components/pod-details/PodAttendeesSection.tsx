import { Avatar, Box, Stack, Tooltip, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

interface Attendee {
  user_id: string;
  full_name?: string | null;
  profile_photo?: string | null;
}

interface Props {
  attendees: Attendee[];
  attendeeIds: string[];
  totalSpots: number;
}

const MAX_PREVIEW = 8;

export default function PodAttendeesSection({
  attendees,
  attendeeIds,
  totalSpots,
}: Readonly<Props>) {
  const navigate = useNavigate();
  const count = attendeeIds?.length ?? 0;
  const byId = new Map(attendees.map((a) => [a.user_id, a]));
  const previews = (attendeeIds ?? []).slice(0, MAX_PREVIEW).map((id) =>
    byId.get(id) ?? { user_id: id, full_name: null, profile_photo: null }
  );
  const extra = count - previews.length;

  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        {totalSpots > 0
          ? `${count} of ${totalSpots} spots filled`
          : `${count} attendee${count === 1 ? '' : 's'} so far`}
      </Typography>
      {count === 0 ? (
        <Typography variant="caption" color="text.secondary">
          Be the first to join!
        </Typography>
      ) : (
        <Stack direction="row" sx={{ pl: 0.5, flexWrap: 'wrap', rowGap: 1 }}>
          {previews.map((a, i) => (
            <Tooltip key={a.user_id} title={a.full_name || 'View profile'}>
              <Avatar
                src={a.profile_photo || undefined}
                onClick={() => navigate(`/u/${a.user_id}`)}
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: 'primary.main',
                  fontSize: 13,
                  border: '2px solid',
                  borderColor: 'background.paper',
                  ml: i === 0 ? 0 : -1,
                  cursor: 'pointer',
                  transition: 'transform 120ms',
                  '&:hover': { transform: 'translateY(-2px)' },
                }}
              >
                {(a.full_name?.[0] ?? '?').toUpperCase()}
              </Avatar>
            </Tooltip>
          ))}
          {extra > 0 && (
            <Box
              sx={{
                width: 36,
                height: 36,
                ml: -1,
                borderRadius: '50%',
                bgcolor: 'action.hover',
                border: '2px solid',
                borderColor: 'background.paper',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                color: 'text.secondary',
              }}
            >
              +{extra}
            </Box>
          )}
        </Stack>
      )}
    </Stack>
  );
}
