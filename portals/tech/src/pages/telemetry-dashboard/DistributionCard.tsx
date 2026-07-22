import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import type { CountBucket } from './queries';

interface Props {
  title: string;
  buckets: CountBucket[];
}

/** Simple horizontal-bar distribution (dependency-free) for a set of {key,count}. */
export default function DistributionCard({ title, buckets }: Readonly<Props>) {
  const max = buckets.reduce((m, b) => Math.max(m, b.count), 0) || 1;
  return (
    <Card sx={{ flex: 1, minWidth: 260 }}>
      <CardContent>
        <Typography variant="subtitle2" gutterBottom>
          {title}
        </Typography>
        {buckets.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No data in this range.
          </Typography>
        ) : (
          <Stack spacing={1.25} sx={{ mt: 1 }}>
            {buckets.map((b) => (
              <Box key={b.key}>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.25 }}>
                  <Typography variant="caption" noWrap title={b.key} sx={{ maxWidth: '75%' }}>
                    {b.key}
                  </Typography>
                  <Typography variant="caption" fontWeight={700}>
                    {b.count}
                  </Typography>
                </Stack>
                <Box sx={{ height: 6, borderRadius: 3, bgcolor: 'action.hover', overflow: 'hidden' }}>
                  <Box
                    sx={{
                      height: '100%',
                      width: `${(b.count / max) * 100}%`,
                      bgcolor: 'primary.main',
                      borderRadius: 3,
                    }}
                  />
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
