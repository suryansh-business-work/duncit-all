import { Box, Skeleton, Stack } from '@mui/material';

export default function HomeSkeleton() {
  return (
    <Stack spacing={4}>
      <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 2 }} />
      {[0, 1].map((i) => (
        <Box key={i}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
            <Skeleton variant="rounded" width={44} height={44} />
            <Box sx={{ flex: 1 }}>
              <Skeleton width="40%" height={24} />
              <Skeleton width="60%" height={16} />
            </Box>
            <Skeleton variant="rounded" width={70} height={24} />
          </Stack>
          <Stack direction="row" spacing={2} sx={{ overflow: 'hidden' }}>
            {[0, 1, 2].map((j) => (
              <Box key={j} sx={{ minWidth: 240 }}>
                <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 1 }} />
                <Skeleton width="80%" height={22} sx={{ mt: 1 }} />
                <Skeleton width="50%" height={16} />
              </Box>
            ))}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}
