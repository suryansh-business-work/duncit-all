import { Box, Button, Card, CardContent, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import type { BrandWarehouse } from './warehouse.queries';

interface WarehouseCardProps {
  warehouse: BrandWarehouse;
  busy: boolean;
  onEdit: (warehouse: BrandWarehouse) => void;
  onDelete: (warehouse: BrandWarehouse) => void;
  onSetDefault: (warehouse: BrandWarehouse) => void;
}

const addressLine = (warehouse: BrandWarehouse) =>
  [warehouse.address_line1, warehouse.address_line2, warehouse.city, warehouse.state, warehouse.pincode]
    .filter(Boolean)
    .join(', ');

/** One warehouse card: address summary, ShipRocket status, edit/delete/default. */
function WarehouseCard({ warehouse, busy, onEdit, onDelete, onSetDefault }: Readonly<WarehouseCardProps>) {
  const shiprocketChip = warehouse.shiprocket_registered
    ? <Chip size="small" color="success" label="Registered" />
    : <Chip size="small" color="warning" label="Pending admin registration" />;
  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between">
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography fontWeight={900}>{warehouse.nickname}</Typography>
              {warehouse.is_default && <Chip size="small" color="primary" label="Default" />}
              {shiprocketChip}
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {addressLine(warehouse)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {warehouse.contact_name} · {warehouse.phone} · {warehouse.email}
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.5} alignItems="flex-start">
            <Tooltip title={warehouse.is_default ? 'Default warehouse' : 'Make default'}>
              <span>
                <IconButton
                  size="small"
                  color="primary"
                  disabled={busy || warehouse.is_default}
                  onClick={() => onSetDefault(warehouse)}
                  aria-label={`Make ${warehouse.nickname} default`}
                >
                  {warehouse.is_default ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Edit">
              <IconButton size="small" disabled={busy} onClick={() => onEdit(warehouse)} aria-label={`Edit ${warehouse.nickname}`}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton size="small" color="error" disabled={busy} onClick={() => onDelete(warehouse)} aria-label={`Delete ${warehouse.nickname}`}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

interface Props {
  warehouses: BrandWarehouse[];
  busy: boolean;
  onAdd: () => void;
  onEdit: (warehouse: BrandWarehouse) => void;
  onDelete: (warehouse: BrandWarehouse) => void;
  onSetDefault: (warehouse: BrandWarehouse) => void;
}

/** The brand's warehouses as cards with add/edit/delete/set-default actions. */
export default function WarehouseList({ warehouses, busy, onAdd, onEdit, onDelete, onSetDefault }: Readonly<Props>) {
  return (
    <Stack spacing={1.5}>
      {warehouses.length === 0 && (
        <Stack alignItems="center" spacing={1} sx={{ py: 3 }}>
          <WarehouseIcon color="disabled" sx={{ fontSize: 40 }} />
          <Typography color="text.secondary">
            No warehouses yet — add the location your products ship from.
          </Typography>
        </Stack>
      )}
      {warehouses.map((warehouse) => (
        <WarehouseCard
          key={warehouse.id}
          warehouse={warehouse}
          busy={busy}
          onEdit={onEdit}
          onDelete={onDelete}
          onSetDefault={onSetDefault}
        />
      ))}
      <Button variant="contained" onClick={onAdd} sx={{ alignSelf: 'flex-start' }}>
        Add warehouse
      </Button>
    </Stack>
  );
}
