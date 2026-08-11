import { Box, Card, CardContent, LinearProgress, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import type { MailPreferenceBucket } from './queries';

/**
 * Where the changes were made — the app, mWeb, the website, or straight off a
 * link in an email. Worth having on its own: a spike in opt-outs made FROM an
 * email is a campaign people wanted out of, and a spike made from the app is
 * usually somebody tidying up their settings.
 */
export default function SourceBreakdown({ rows }: Readonly<{ rows: MailPreferenceBucket[] }>) {
  const { t } = useTranslation();
  const top = rows[0]?.count ?? 0;

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
          {t('mailPreference.analytics.bySource')}
        </Typography>

        {rows.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            {t('mailPreference.analytics.noSource')}
          </Typography>
        )}

        <Stack spacing={1.25}>
          {rows.map((row) => (
            <Box key={row.key}>
              <Stack direction="row" justifyContent="space-between" spacing={1}>
                <Typography variant="body2">{row.key}</Typography>
                <Typography variant="body2" fontWeight={700}>
                  {row.count.toLocaleString()}
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                // `top` is only 0 when there are no rows, and then this never renders.
                value={Math.round((row.count / top) * 100)}
                sx={{ height: 6, borderRadius: 3, mt: 0.5 }}
              />
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
