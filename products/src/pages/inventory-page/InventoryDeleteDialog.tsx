import { useEffect } from 'react';
import { useLazyQuery, useMutation } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { ARCHIVE_INVENTORY_PRODUCT } from './inventory-product-page/productQueries';
import {
  INVENTORY_LINKED_PODS,
  PERMANENT_DELETE_INVENTORY_PRODUCT,
} from './inventory-product-page/productQueries';
import { DELETE_PRODUCT } from './queries';

export type InventoryDeleteIntent = 'archive' | 'delete';

interface InventoryDeleteDialogProps {
  open: boolean;
  intent: InventoryDeleteIntent;
  product: { id: string; product_name: string } | null;
  onClose: () => void;
  onDone: () => Promise<unknown> | void;
}

export default function InventoryDeleteDialog({
  open,
  intent,
  product,
  onClose,
  onDone,
}: Readonly<InventoryDeleteDialogProps>) {
  const [loadLinkedPods, linkedPodsResult] = useLazyQuery(INVENTORY_LINKED_PODS, {
    fetchPolicy: 'network-only',
  });
  const [archive, archiveResult] = useMutation(ARCHIVE_INVENTORY_PRODUCT);
  const [softDelete, softDeleteResult] = useMutation(DELETE_PRODUCT);
  const [permanentlyDelete, permanentResult] = useMutation(
    PERMANENT_DELETE_INVENTORY_PRODUCT
  );

  useEffect(() => {
    if (open && product?.id && intent === 'delete') {
      void loadLinkedPods({ variables: { id: product.id } });
    }
  }, [open, product?.id, intent, loadLinkedPods]);

  const linkedPods: any[] = linkedPodsResult.data?.inventoryProductLinkedPods ?? [];
  const busy =
    archiveResult.loading ||
    softDeleteResult.loading ||
    permanentResult.loading ||
    linkedPodsResult.loading;

  const runArchive = async () => {
    if (!product) return;
    try {
      await archive({ variables: { id: product.id } });
    } catch {
      await softDelete({ variables: { id: product.id } });
    }
    await onDone();
    onClose();
  };

  const runDelete = async () => {
    if (!product) return;
    await permanentlyDelete({ variables: { id: product.id } });
    await onDone();
    onClose();
  };

  const isDelete = intent === 'delete';
  const title = isDelete ? 'Permanently delete product?' : 'Archive product?';

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {isDelete ? (
            <>
              This permanently deletes <strong>{product?.product_name}</strong> and its
              activity history. This cannot be undone.
            </>
          ) : (
            <>
              Archiving hides <strong>{product?.product_name}</strong> from active lists.
              You can restore it from the product page.
            </>
          )}
        </DialogContentText>
        {isDelete && (
          <Box sx={{ mt: 2 }}>
            {linkedPodsResult.loading ? (
              <Stack direction="row" alignItems="center" spacing={1}>
                <CircularProgress size={16} />
                <Typography variant="body2" color="text.secondary">
                  Checking linked pods…
                </Typography>
              </Stack>
            ) : linkedPods.length > 0 ? (
              <Alert severity="warning">
                <Typography variant="subtitle2" gutterBottom>
                  Linked to {linkedPods.length} pod{linkedPods.length === 1 ? '' : 's'}
                </Typography>
                <List dense disablePadding sx={{ maxHeight: 180, overflowY: 'auto' }}>
                  {linkedPods.slice(0, 8).map((pod) => (
                    <ListItem key={pod.id} disablePadding>
                      <ListItemText
                        primary={pod.pod_title}
                        secondary={
                          <Chip
                            size="small"
                            label={pod.is_active ? 'Active' : 'Inactive'}
                            color={pod.is_active ? 'success' : 'default'}
                            sx={{ height: 18, fontSize: 11 }}
                          />
                        }
                      />
                    </ListItem>
                  ))}
                </List>
                <Typography variant="caption">
                  Those pods will keep a snapshot copy but the link will be lost.
                </Typography>
              </Alert>
            ) : (
              <Alert severity="info">No pods reference this product.</Alert>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color={isDelete ? 'error' : 'warning'}
          onClick={isDelete ? runDelete : runArchive}
          disabled={busy}
          startIcon={busy ? <CircularProgress size={16} /> : undefined}
        >
          {isDelete ? 'Delete permanently' : 'Archive'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
