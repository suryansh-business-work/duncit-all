import { useApolloClient } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { Box, Stack, Typography } from '@mui/material';
import { useApolloTableFetch } from '@duncit/table';
import CatalogBrandsTable from './CatalogBrandsTable';
import { CATALOG_BRANDS_TABLE, type CatalogBrandRow } from './queries';

/**
 * Catalog > Brands — the catalogue of non-Duncit seller brands. `ecommBrandsTable`
 * is unscoped, so drafts, submitted, rejected and deactivated brands are all
 * listed. Approve/reject is not offered here: that is Brands Review's job.
 */
export default function CatalogBrandsPage() {
  const navigate = useNavigate();
  const client = useApolloClient();

  const fetchRows = useApolloTableFetch<CatalogBrandRow>(
    client,
    CATALOG_BRANDS_TABLE,
    'ecommBrandsTable',
  );

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{
          fontWeight: 700
        }}>
          Brands
        </Typography>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          Every seller brand in the catalogue, whatever its review status. Open a brand&apos;s
          products or manage its details — approvals live in Brands &amp; Products Review.
        </Typography>
      </Box>

      <CatalogBrandsTable
        fetchRows={fetchRows}
        onProducts={(b) => navigate(`/catalog/brands/${b.id}/products`)}
        onManage={(b) => navigate(`/catalog/brands/${b.id}`)}
      />
    </Stack>
  );
}
