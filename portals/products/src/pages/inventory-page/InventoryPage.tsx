import AddIcon from '@mui/icons-material/Add';
import { useApolloClient, useMutation } from '@apollo/client';
import { Box, Button, Stack, Typography } from '@mui/material';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApolloTableFetch } from '@duncit/table';
import { ConfirmDialog, notifyError, notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import InventoryDeleteDialog, { type InventoryDeleteIntent } from './InventoryDeleteDialog';
import InventoryTable from './InventoryTable';
import { SET_INVENTORY_PRODUCT_ACTIVE } from './inventory-product-page/productQueries';
import { INVENTORY_PRODUCTS_TABLE, type InventoryProductRow } from './queries';

// This page is the Duncit catalogue only — same scope the old query
// hardcoded via its `ownership` variable (server-allowlisted enum filter).
const DUNCIT_OWNERSHIP_FILTER = [{ field: 'ownership', op: 'eq', value: 'DUNCIT' }] as const;

const PAUSE_MESSAGE =
  'The product is hidden from the shop and pod product picker until it is reactivated. Orders already placed are not affected.';
const RESUME_MESSAGE = 'The product becomes visible and purchasable in the shop again.';

export default function InventoryPage() {
  const navigate = useNavigate();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [actionTarget, setActionTarget] = useState<{
    intent: InventoryDeleteIntent;
    product: { id: string; product_name: string };
  } | null>(null);
  const [pauseTarget, setPauseTarget] = useState<InventoryProductRow | null>(null);
  const [setProductActive, pauseState] = useMutation(SET_INVENTORY_PRODUCT_ACTIVE);

  const activating = pauseTarget?.is_active === false;
  const pauseLabel = activating ? 'Reactivate' : 'Deactivate';

  const runPauseToggle = async () => {
    if (!pauseTarget) return;
    try {
      await setProductActive({ variables: { id: pauseTarget.id, active: activating } });
      notifySuccess(activating ? 'Product reactivated' : 'Product temporarily deactivated');
      refetchRef.current?.();
    } catch (error) {
      notifyError(parseApiError(error, 'Could not update the product'));
    }
    setPauseTarget(null);
  };

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
        onToggleActive={setPauseTarget}
        onDelete={(p) => setActionTarget({ intent: 'delete', product: p })}
      />

      <InventoryDeleteDialog
        open={!!actionTarget}
        intent={actionTarget?.intent ?? 'archive'}
        product={actionTarget?.product ?? null}
        onClose={() => setActionTarget(null)}
        onDone={() => refetchRef.current?.()}
      />

      <ConfirmDialog
        open={!!pauseTarget}
        title={`${pauseLabel} product?`}
        message={activating ? RESUME_MESSAGE : PAUSE_MESSAGE}
        confirmLabel={pauseLabel}
        confirmColor={activating ? 'success' : 'warning'}
        loading={pauseState.loading}
        busyLabel="Working…"
        onClose={() => setPauseTarget(null)}
        onConfirm={runPauseToggle}
      />
    </Stack>
  );
}
