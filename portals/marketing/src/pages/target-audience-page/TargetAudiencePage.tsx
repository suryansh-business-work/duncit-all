import { useMemo, useRef } from 'react';
import { useApolloClient, useQuery } from '@apollo/client';
import { Alert, Box, Stack, Typography } from '@mui/material';
import { useApolloTableFetch } from '@duncit/table';
import { useDateFormat } from '@duncit/app-settings';
import { useAdminLocations } from '@duncit/location';
import AudienceTable from './AudienceTable';
import { AUDIENCE_FILTER_OPTIONS, AUDIENCE_TABLE } from './queries';
import { locationOptions, toOptions, type AudienceRow } from './helpers';

interface FilterOptionsData {
  audienceFilterOptions: {
    interests: { id: string; name: string }[];
    roles: string[];
  };
}

export default function TargetAudiencePage() {
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const { formatDateTime } = useDateFormat();
  const { locations } = useAdminLocations();
  const { data } = useQuery<FilterOptionsData>(AUDIENCE_FILTER_OPTIONS, {
    fetchPolicy: 'cache-and-network',
  });

  const fetchRows = useApolloTableFetch<AudienceRow>(client, AUDIENCE_TABLE, 'audienceTable');

  const interests = data?.audienceFilterOptions?.interests ?? [];
  const roles = data?.audienceFilterOptions?.roles ?? [];
  const interestKey = interests.map((i) => i.id).join(',');
  const roleKey = roles.join(',');

  const columnDeps = useMemo(
    () => {
      const place = locationOptions(locations);
      return {
        roleOptions: toOptions(roles),
        interestOptions: interests.map((i) => ({ value: i.id, label: i.name })),
        countryOptions: place.country,
        stateOptions: place.state,
        cityOptions: place.city,
        zoneOptions: place.zone,
        formatDate: formatDateTime,
      };
    },
    // Keyed on the option identities, not the array objects, which are new on
    // every render of the Apollo result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locations, interestKey, roleKey, formatDateTime],
  );

  return (
    <Box>
      <Stack spacing={0.25} mb={2}>
        <Typography variant="h5" fontWeight={700}>
          Target Audience
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Everyone on Duncit, sliced by who they are, where they are and how you can reach them.
          Closed accounts are never listed.
        </Typography>
      </Stack>

      <Alert severity="info" sx={{ mb: 2 }}>
        <strong>Push reachable</strong> is who you can push to right now — it comes from live push
        registrations, so someone who never granted notifications or has signed out will not appear
        under any platform. <strong>Age</strong> is derived from date of birth, so accounts that
        never supplied one are excluded whenever an age filter is applied.
      </Alert>

      <AudienceTable fetchRows={fetchRows} refetchRef={refetchRef} columnDeps={columnDeps} />
    </Box>
  );
}
