import { Box, Stack, Typography } from '@mui/material';

interface Bucket {
  bucket: string;
  unique_devices: number;
  unique_users: number;
}

interface Props {
  buckets: Bucket[];
}

export default function ActiveUsersChart({ buckets }: Props) {
  if (!buckets.length) {
    return <Typography color="text.secondary">No activity in this range yet.</Typography>;
  }
  const max = Math.max(1, ...buckets.map((b) => Math.max(b.unique_devices, b.unique_users)));

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={2} sx={{ fontSize: 12, color: 'text.secondary' }}>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Box sx={{ width: 10, height: 10, bgcolor: '#FF4D4F', borderRadius: 0.5 }} />
          <span>Unique devices</span>
        </Stack>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Box sx={{ width: 10, height: 10, bgcolor: '#1f2937', borderRadius: 0.5 }} />
          <span>Logged-in users</span>
        </Stack>
      </Stack>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 1,
          height: 220,
          overflowX: 'auto',
          pb: 1,
        }}
      >
        {buckets.map((b) => (
          <Stack
            key={b.bucket}
            spacing={0.5}
            alignItems="center"
            sx={{ minWidth: 36, flexShrink: 0 }}
          >
            <Stack direction="row" spacing={0.5} alignItems="flex-end" sx={{ height: 180 }}>
              <Box
                title={`Devices: ${b.unique_devices}`}
                sx={{
                  width: 14,
                  bgcolor: '#FF4D4F',
                  borderRadius: 1,
                  height: `${(b.unique_devices / max) * 100}%`,
                  transition: 'height 200ms ease',
                  minHeight: 2,
                }}
              />
              <Box
                title={`Users: ${b.unique_users}`}
                sx={{
                  width: 14,
                  bgcolor: '#1f2937',
                  borderRadius: 1,
                  height: `${(b.unique_users / max) * 100}%`,
                  transition: 'height 200ms ease',
                  minHeight: 2,
                }}
              />
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
              {b.bucket}
            </Typography>
          </Stack>
        ))}
      </Box>
    </Stack>
  );
}
