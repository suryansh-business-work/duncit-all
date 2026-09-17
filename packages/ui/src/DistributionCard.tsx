import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import { useTranslation } from './i18n/useTranslation';

/** One bar: a label and how many rows carry it. */
export interface DistributionBucket {
  key: string;
  count: number;
}

export interface DistributionCardProps {
  title: string;
  buckets: readonly DistributionBucket[];
  /** What an empty range says. */
  emptyText?: string;
}

/** Simple horizontal-bar distribution (dependency-free) for a set of {key,count}. */
export function DistributionCard({ title, buckets, emptyText }: Readonly<DistributionCardProps>) {
  const { t } = useTranslation();
  const max = buckets.reduce((m, b) => Math.max(m, b.count), 0) || 1;
  return (
    <Card sx={{ flex: 1, minWidth: 260 }}>
      <CardContent>
        <Typography variant="subtitle2" gutterBottom>
          {title}
        </Typography>
        {buckets.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {emptyText ?? t('ui.distributionCard.empty')}
          </Typography>
        ) : (
          <Stack spacing={1.25} sx={{ mt: 1 }}>
            {buckets.map((b) => (
              <Box key={b.key}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.25 }}>
                  <Typography variant="caption" noWrap title={b.key} sx={{ maxWidth: '75%' }}>
                    {b.key}
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>
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
