import { useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Box, Stack, Typography } from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import AddIcon from '@mui/icons-material/Add';
import { Link as RouterLink } from 'react-router';
import { DuncitButton } from '@duncit/buttons';
import { useApolloTableFetch } from '@duncit/table';
import SuperCategoryFilter from '../../shared/SuperCategoryFilter';
import { VENUES_TABLE, type VenueRow } from './queries';
import VenuesTable from './VenuesTable';
import { useTranslation } from '@duncit/shell';

/**
 * Venues: every venue Duncit works with, and the way to add one.
 *
 * The list itself is the server-side table engine, so the filters, the sort and
 * the paging are all one query. A row opens the record; Add Venue opens the same
 * editor with nothing in it.
 */
export default function VenuesPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  // Page-level filter, pinned outside the table so it survives the table's own
  // column filters and resets paging when it changes.
  const [superCategoryId, setSuperCategoryId] = useState('');

  const fetchRows = useApolloTableFetch<VenueRow>(client, VENUES_TABLE, 'venuesTable');

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          mb: 3,
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <StorefrontIcon color="primary" />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {t('admin.clubs.venues')}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('directory.venues.subtitle')}
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <SuperCategoryFilter value={superCategoryId} onChange={setSuperCategoryId} />
          <DuncitButton
            component={RouterLink}
            to="/venues/new"
            variant="contained"
            startIcon={<AddIcon />}
          >
            {t('directory.venueEditor.addVenue')}
          </DuncitButton>
        </Stack>
      </Stack>
      <VenuesTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        superCategoryId={superCategoryId}
      />
    </Box>
  );
}
