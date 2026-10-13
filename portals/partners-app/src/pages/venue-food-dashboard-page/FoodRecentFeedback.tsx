import { Card, Divider, Stack, Typography } from '@mui/material';
import { formatDateTime } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import FoodFeedbackBody from '../../components/venue/FoodFeedbackBody';
import type { FoodFeedbackRow } from './queries';

interface Props {
  feedback: readonly FoodFeedbackRow[];
}

/** What guests said lately: who, on which order, the stars, their words and their photos. */
export default function FoodRecentFeedback({ feedback }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }} data-testid="food-dashboard-feedback">
      <Stack spacing={1.5}>
        <Typography variant="subtitle2" component="h2" sx={{ fontWeight: 900 }}>
          {t('partners.foodDashboard.recentFeedback')}
        </Typography>
        {feedback.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('partners.foodDashboard.noFeedback')}
          </Typography>
        ) : (
          <Stack component="ul" spacing={1.5} divider={<Divider flexItem component="li" aria-hidden />} sx={{ listStyle: 'none', m: 0, p: 0 }}>
            {feedback.map((row) => (
              <Stack key={row.order_no} component="li" spacing={0.75}>
                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
                    {t('partners.foodDashboard.feedbackBy', {
                      vars: { name: row.customer_name || t('partners.foodDashboard.guest'), no: row.order_no },
                    })}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {formatDateTime(row.submitted_at)}
                  </Typography>
                </Stack>
                <FoodFeedbackBody feedback={row} data-testid="food-dashboard-feedback-row" />
              </Stack>
            ))}
          </Stack>
        )}
      </Stack>
    </Card>
  );
}
