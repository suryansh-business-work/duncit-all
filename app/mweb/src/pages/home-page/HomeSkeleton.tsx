import { Box, Skeleton, Stack } from '@mui/material';

const CHIP_IDS = ['c1', 'c2', 'c3', 'c4'] as const;
const CARD_IDS = ['p1', 'p2'] as const;
const SECTION_IDS = ['s1', 's2'] as const;

/** Home's first-load placeholder in the shape of the page: the search row, the
 * story card, the vibe chips and two rails of event cards. */
export default function HomeSkeleton() {
  return (
    <Stack spacing={3} sx={{ mx: { xs: -1.25, sm: -2 }, px: 2, overflow: 'hidden' }}>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
        <Skeleton variant="rounded" height={52} sx={{ flex: 1, borderRadius: 999 }} />
        <Skeleton variant="circular" width={52} height={52} />
      </Stack>
      <Skeleton variant="rounded" height={96} sx={{ borderRadius: '24px' }} />
      <Stack direction="row" spacing={1}>
        {CHIP_IDS.map((id) => (
          <Skeleton key={id} variant="rounded" width={96} height={40} sx={{ borderRadius: 999, flex: '0 0 auto' }} />
        ))}
      </Stack>
      {SECTION_IDS.map((section) => (
        <Stack key={section} spacing={1.5}>
          <Skeleton width="45%" height={24} />
          <Stack direction="row" spacing={1.5}>
            {CARD_IDS.map((id) => (
              <Box key={id} sx={{ width: 268, flex: '0 0 auto' }}>
                <Skeleton variant="rounded" height={240} sx={{ borderRadius: '24px' }} />
              </Box>
            ))}
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
}
