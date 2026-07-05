import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  MenuItem,
  TextField,
} from '@mui/material';
import { BRAND_PICKUP_LOCATIONS } from '../ecomm/queries';

interface Props {
  open: boolean;
  order: any;
  submitting?: boolean;
  onClose: () => void;
  onConfirm: (pickupLocationId: string) => void;
}

function derivePickupOwner(order: any) {
  const brandItem = (order.line_items ?? []).find(
    (item: any) => item.ownership === 'BRAND' && item.brand_id,
  );
  if (brandItem) return { owner_kind: 'BRAND', brand_doc_id: brandItem.brand_id };
  return { owner_kind: 'DUNCIT', brand_doc_id: null };
}

export default function OrderShipmentDialog({ open, order, submitting, onClose, onConfirm }: Readonly<Props>) {
  const variables = derivePickupOwner(order);
  const { data, loading } = useQuery(BRAND_PICKUP_LOCATIONS, {
    variables,
    skip: !open,
    fetchPolicy: 'cache-and-network',
  });
  const locations = data?.brandPickupLocations ?? [];
  const [selected, setSelected] = useState('');

  useEffect(() => {
    if (!open) return;
    const preset = order.pickup_location_id || locations.find((item: any) => item.is_default)?.id || '';
    setSelected(preset);
  }, [open, locations, order.pickup_location_id]);

  const chosen = locations.find((item: any) => item.id === selected);
  const notRegistered = chosen && !chosen.shiprocket_registered;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create ShipRocket shipment</DialogTitle>
      <DialogContent dividers>
        <DialogContentText sx={{ mb: 2 }}>
          Pick the warehouse the courier should collect this order from.
        </DialogContentText>
        {loading && locations.length === 0 ? (
          <CircularProgress size={22} />
        ) : (
          <TextField
            select
            fullWidth
            label="Pickup location"
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
            helperText={locations.length === 0 ? 'No pickup locations found for this owner.' : ' '}
          >
            {locations.map((location: any) => (
              <MenuItem key={location.id} value={location.id}>
                {location.nickname} — {location.city}
                {location.is_default ? ' (default)' : ''}
              </MenuItem>
            ))}
          </TextField>
        )}
        {notRegistered && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            This location is not registered with ShipRocket yet. Register it from the brand page first.
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={submitting || !selected || Boolean(notRegistered)}
          onClick={() => onConfirm(selected)}
        >
          {submitting ? 'Creating…' : 'Create shipment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
