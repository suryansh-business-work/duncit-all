import { Box, Card, CardContent, LinearProgress, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import type { MailPreferenceCategoryStat } from './queries';

/**
 * How each category is doing: how many people refuse it today, and how the
 * window moved that number.
 *
 * The bar is the share of the WORST category rather than of the audience — the
 * audience size is not in this query, and a bar drawn against a number the page
 * does not have would be a shape nobody could check.
 */
export default function CategoryBreakdown({
  rows,
}: Readonly<{ rows: MailPreferenceCategoryStat[] }>) {
  const { t } = useTranslation();
  const worst = Math.max(...rows.map((row) => row.opted_out_now), 0);

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
          {t('mailPreference.analytics.byCategory')}
        </Typography>

        <Stack spacing={1.5}>
          {rows.map((row) => (
            <Box key={row.category}>
              <Stack direction="row" justifyContent="space-between" spacing={1}>
                <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
                  {t(`mailPreference.categories.${row.category}.label`)}
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  {row.opted_out_now.toLocaleString()}
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={worst === 0 ? 0 : Math.round((row.opted_out_now / worst) * 100)}
                sx={{ height: 6, borderRadius: 3, mt: 0.5 }}
              />
              <Typography variant="caption" color="text.secondary">
                −{row.opt_outs.toLocaleString()} · +{row.opt_ins.toLocaleString()}
              </Typography>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
