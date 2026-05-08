import { Avatar, Box, Stack, Typography } from '@mui/material';

interface Props {
  attendeeIds: string[];
  totalSpots: number;
}

// Compact horizontal preview. Real avatars require a public users-by-ids
// query — until that exists, render initial placeholders with the count.
export default function PodAttendeesSection({ attendeeIds, totalSpots }: Props) {
  const count = attendeeIds?.length ?? 0;
  const previews = (attendeeIds ?? []).slice(0, 8);
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
        <Stack direction="row" spacing={-1} sx={{ pl: 0.5 }}>
          {previews.map((id, i) => (
            <Avatar
              key={id}
              sx={{
                width: 32,
                height: 32,
                bgcolor: 'primary.main',
                fontSize: 12,
                border: '2px solid',
                borderColor: 'background.paper',
                ml: i === 0 ? 0 : -1,
              }}
            >
              {(id?.[0] ?? '?').toUpperCase()}
            </Avatar>
          ))}
          {count > previews.length && (
            <Box
              sx={{
                width: 32,
                height: 32,
                ml: -1,
                borderRadius: '50%',
                bgcolor: 'action.hover',
                border: '2px solid',
                borderColor: 'background.paper',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                color: 'text.secondary',
              }}
            >
              +{count - previews.length}
            </Box>
          )}
        </Stack>
      )}
    </Stack>
  );
}
