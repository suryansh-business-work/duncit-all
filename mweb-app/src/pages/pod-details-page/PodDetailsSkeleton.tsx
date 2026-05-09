import { Skeleton, Stack } from '@mui/material';

export default function PodDetailsSkeleton() {
  return (
    <Stack spacing={3}>
      <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
      <Skeleton width="60%" height={40} />
      <Stack direction="row" spacing={1}>
        <Skeleton variant="rounded" width={80} height={28} />
        <Skeleton variant="rounded" width={120} height={28} />
        <Skeleton variant="rounded" width={100} height={28} />
      </Stack>
      <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 2 }} />
      <Skeleton variant="text" height={28} width="40%" />
      <Skeleton variant="text" height={20} />
      <Skeleton variant="text" height={20} width="80%" />
    </Stack>
  );
}
