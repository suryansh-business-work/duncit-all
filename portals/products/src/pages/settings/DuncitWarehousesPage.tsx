import { Box, Card, CardContent, Divider, Stack, Typography } from '@mui/material';
import PickupLocationsPanel from '../ecomm/PickupLocationsPanel';

/** Settings › Duncit Warehouse Locations. Manages the Duncit-owned
 * (owner_kind DUNCIT) warehouses that first-party products ship from and that
 * ShipRocket uses as the pickup origin for delivery rates + shipments. */
export default function DuncitWarehousesPage() {
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" fontWeight={700}>
          Duncit Warehouse Locations
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Add and manage the warehouses Duncit products ship from. Each Duncit
          product must select one of these as its pickup origin.
        </Typography>
      </Box>

      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <PickupLocationsPanel
            owner={{ owner_kind: 'DUNCIT', brandId: null }}
            title="Duncit warehouses"
            emptyHint="No Duncit warehouses yet. Add one so products have a shipping origin."
          />
          <Divider sx={{ mt: 2 }} />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Registering a warehouse with ShipRocket lets SHIP orders pick up from it and enables live delivery rates.
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  );
}
