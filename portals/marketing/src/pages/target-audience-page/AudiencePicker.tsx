import { useMemo } from 'react';
import { useApolloClient, useQuery } from '@apollo/client';
import { Box, Stack } from '@mui/material';
import { useApolloTableFetch } from '@duncit/table';
import { useDateFormat } from '@duncit/app-settings';
import { useAdminLocations } from '@duncit/location';
import AudienceTable from './AudienceTable';
import { FilterSidebar, buildFilters, type AudienceFilterState } from './audience-filters';
import { AUDIENCE_FILTER_OPTIONS, AUDIENCE_TABLE } from './queries';
import { locationOptions, toOptions, type AudienceRow } from './helpers';

interface FilterOptionsData {
  audienceFilterOptions: {
    interests: { id: string; name: string }[];
    roles: string[];
  };
}

interface Props {
  filters: AudienceFilterState;
  onFiltersChange: (next: AudienceFilterState) => void;
}

/**
 * The filter sidebar plus the people it matches — the same pairing used by
 * step 1 of the create wizard and by a saved list's detail page, so a list is
 * always previewed exactly the way it was built.
 */
export default function AudiencePicker({ filters, onFiltersChange }: Readonly<Props>) {
  const client = useApolloClient();
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

  const options = useMemo(
    () => {
      const place = locationOptions(locations);
      return {
        roles: toOptions(roles),
        interests: interests.map((i) => ({ value: i.id, label: i.name })),
        ...place,
      };
    },
    // Keyed on option identity, not the array objects Apollo rebuilds each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locations, interestKey, roleKey],
  );

  const columnDeps = useMemo(() => ({ formatDate: formatDateTime }), [formatDateTime]);
  const externalFilters = useMemo(() => buildFilters(filters), [filters]);

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
      <Box sx={{ width: { xs: '100%', md: 320 }, flexShrink: 0 }}>
        <FilterSidebar state={filters} onChange={onFiltersChange} options={options} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
        <AudienceTable
          fetchRows={fetchRows}
          columnDeps={columnDeps}
          externalFilters={externalFilters}
        />
      </Box>
    </Stack>
  );
}
