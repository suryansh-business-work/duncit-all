import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';
import { RequestLimitForm } from '../pod-requests/request-limit';
import { UPDATE_VENUE_REQUEST_LIMIT, type VenueSettingsVenue } from './queries';

interface Props {
  venue: VenueSettingsVenue;
  onSaved: () => Promise<unknown>;
}

/** Venue Settings → "Maximum Host Requests / Month", per venue. */
export default function HostRequestLimitCard({ venue, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [save, saveState] = useMutation(UPDATE_VENUE_REQUEST_LIMIT);

  const onSave = async (limit: number) => {
    setError(null);
    try {
      await save({
        variables: { venue_doc_id: venue.id, input: { rules: { max_host_requests_per_month: limit } } },
      });
      await onSaved();
    } catch (saveError) {
      setError(parseApiError(saveError));
    }
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600 }}>
            {t('podRequests.venueLimitLabel')}
          </Typography>
          <RequestLimitForm
            key={venue.id}
            label={t('podRequests.venueLimitLabel')}
            limit={venue.settings.rules.max_host_requests_per_month}
            override={venue.host_requests_limit_override}
            saving={saveState.loading}
            error={error}
            onSave={onSave}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
