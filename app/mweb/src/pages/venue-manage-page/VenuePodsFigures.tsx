import { useQuery } from '@apollo/client/react';
import { Alert, Card, CardContent, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import SectionHeader from '../../components/SectionHeader';
import {
  StudioPodsFigures,
  VENUE_STUDIO_SUMMARY,
  type StudioPodSummary,
} from '../../components/studio-pods';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * The venue's pod figures on the Venue Studio dashboard — totals, fill rate and
 * the next pod — computed server-side (venuePodsSummary) over every booking.
 * The pod list itself and its row actions live on "Pods at Your Venue".
 */
export default function VenuePodsFigures({ venueId }: Readonly<{ venueId: string }>) {
  const { t } = useTranslation();
  const { data, error, refetch } = useQuery<{ studioSummary: StudioPodSummary }>(VENUE_STUDIO_SUMMARY, {
    variables: { venue_id: venueId },
    fetchPolicy: 'cache-and-network',
  });

  // Withheld while loading: a strip reading "Total 0" under a load states something false.
  if (!data && !error) return null;

  return (
    <Card data-testid="venue-pods-figures">
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack spacing={1.5}>
          <SectionHeader testId="venue-pods-figures-header" title={t('mweb.studioPods.venueTitle')} />
          {data ? (
            <StudioPodsFigures summary={data.studioSummary} scopeLabel={t('mweb.studioPods.venues')} />
          ) : (
            <Alert
              data-testid="venue-pods-figures-error"
              severity="error"
              action={
                <DuncitButton
                  data-testid="venue-pods-figures-retry"
                  color="inherit"
                  size="small"
                  onClick={() => {
                    refetch().catch((retryError: unknown) => console.warn('[VenuePodsFigures] retry failed', retryError));
                  }}
                >
                  {t('mweb.studioPods.retry')}
                </DuncitButton>
              }
            >
              {t('mweb.studioPods.error')}
            </Alert>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
