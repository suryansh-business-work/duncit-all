import AddIcon from '@mui/icons-material/Add';
import { useApolloClient } from '@apollo/client';
import { Box, Button, Stack, Typography } from '@mui/material';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApolloTableFetch } from '@duncit/table';
import InventoryDeleteDialog, { type InventoryDeleteIntent } from './InventoryDeleteDialog';
import InventoryTable from './InventoryTable';
import { INVENTORY_PRODUCTS_TABLE, type InventoryProductRow } from './queries';

// This page is the Duncit catalogue only — same scope the old query
// hardcoded via its `ownership` variable (server-allowlisted enum filter).
const DUNCIT_OWNERSHIP_FILTER = [{ field: 'ownership', op: 'eq', value: 'DUNCIT' }] as const;

export default function InventoryPage() {
  const navigate = useNavigate();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [actionTarget, setActionTarget] = useState<{
    intent: InventoryDeleteIntent;
    product: { id: string; product_name: string };
  } | null>(null);

  const fetchRows = useApolloTableFetch<InventoryProductRow>(
    client,
    INVENTORY_PRODUCTS_TABLE,
    'inventoryProductsTable',
    { extraFilters: DUNCIT_OWNERSHIP_FILTER },
  );

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" fontWeight={700}>
          Duncit Products
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage Duncit products, available units, and requested counts.
        </Typography>
      </Box>

      <InventoryTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        toolbarActions={
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/inventory/new')}
          >
            Add product
          </Button>
        }
        onEdit={(p) => navigate(`/inventory/${p.id}/edit`)}
        onArchive={(p) => setActionTarget({ intent: 'archive', product: p })}
        onDelete={(p) => setActionTarget({ intent: 'delete', product: p })}
      />

      <InventoryDeleteDialog
        open={!!actionTarget}
        intent={actionTarget?.intent ?? 'archive'}
        product={actionTarget?.product ?? null}
        onClose={() => setActionTarget(null)}
        onDone={() => refetchRef.current?.()}
      />
    </Stack>
  );
}
