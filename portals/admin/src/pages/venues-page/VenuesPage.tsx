import { useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Box, Stack, Typography } from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { useApolloTableFetch } from '@duncit/table';
import SuperCategoryFilter from '../../components/SuperCategoryFilter';
import { VENUES_TABLE, type VenueRow } from './queries';
import VenuesTable from './VenuesTable';
import { useTranslation } from '@duncit/shell';

/** Admin → Venues: a read-only list of every venue (server-side table). The
 * venue approval/edit workflow stays in the Onboarding portal. */
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
          justifyContent: "space-between",
          alignItems: { xs: 'flex-start', sm: 'center' },
          mb: 3
        }}>
        <Stack direction="row" spacing={1.5} sx={{
          alignItems: "center"
        }}>
          <StorefrontIcon color="primary" />
          <Box>
            <Typography variant="h5" sx={{
              fontWeight: 700
            }}>
              {t('admin.clubs.venues')}
            </Typography>
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              Every registered venue. Approvals and edits are managed in the Onboarding portal.
            </Typography>
          </Box>
        </Stack>
        <SuperCategoryFilter value={superCategoryId} onChange={setSuperCategoryId} />
      </Stack>
      <VenuesTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        superCategoryId={superCategoryId}
      />
    </Box>
  );
}
