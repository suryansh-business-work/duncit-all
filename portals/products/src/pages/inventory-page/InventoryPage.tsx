import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import ArchiveIcon from '@mui/icons-material/Archive';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { useQuery } from '@apollo/client';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import InventoryDeleteDialog, { type InventoryDeleteIntent } from './InventoryDeleteDialog';
import StockColorChip from './inventory-product-page/StockColorChip';
import { STATUS_CHIP_COLOR, STATUS_OPTIONS } from './inventory-product-page/constants';
import type { InventoryStatus } from './inventory-product-page/types';
import { INVENTORY_PRODUCTS } from './queries';

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

export default function InventoryPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | InventoryStatus>('');
  const [actionTarget, setActionTarget] = useState<{
    intent: InventoryDeleteIntent;
    product: { id: string; product_name: string };
  } | null>(null);

  const { data, loading, error, refetch } = useQuery(INVENTORY_PRODUCTS, {
    variables: { search: search || undefined, status: statusFilter || undefined, ownership: 'DUNCIT' },
    fetchPolicy: 'cache-and-network',
  });
  const products = data?.inventoryProducts ?? [];

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Duncit Products
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage Duncit products, available units, and requested counts.
          </Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            size="small"
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <TextField
            size="small"
            select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as InventoryStatus)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">All statuses</MenuItem>
            {STATUS_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/inventory/new')}
          >
            Add product
          </Button>
        </Stack>
      </Stack>
      {error && <Alert severity="error">{error.message}</Alert>}
      {loading && products.length === 0 ? (
        <CircularProgress />
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell></TableCell>
              <TableCell>Product</TableCell>
              <TableCell>SKU</TableCell>
              <TableCell>Selling price</TableCell>
              <TableCell>Stock</TableCell>
              <TableCell>Available</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((product: any) => (
              <TableRow
                key={product.id}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => navigate(`/inventory/${product.id}/edit`)}
              >
                <TableCell sx={{ width: 56 }}>
                  <Avatar
                    src={product.image_url || undefined}
                    variant="rounded"
                    sx={{ width: 36, height: 36 }}
                  >
                    {product.product_name?.[0]?.toUpperCase() ?? '?'}
                  </Avatar>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {product.product_name}
                  </Typography>
                  {product.brand_name && (
                    <Typography variant="caption" color="text.secondary">
                      {product.brand_name}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>{product.sku}</TableCell>
                <TableCell>{money.format(product.selling_price || product.unit_cost)}</TableCell>
                <TableCell>
                  <StockColorChip
                    inventory={product.inventory_count}
                    lowStockAlert={product.low_stock_alert ?? 5}
                  />
                </TableCell>
                <TableCell>{product.available_count}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={product.status}
                    color={STATUS_CHIP_COLOR[product.status as InventoryStatus] ?? 'default'}
                  />
                </TableCell>
                <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                  <Tooltip title="Edit">
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/inventory/${product.id}/edit`)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Archive">
                    <IconButton
                      size="small"
                      onClick={() => setActionTarget({ intent: 'archive', product })}
                    >
                      <ArchiveIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete permanently">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setActionTarget({ intent: 'delete', product })}
                    >
                      <DeleteForeverIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <InventoryDeleteDialog
        open={!!actionTarget}
        intent={actionTarget?.intent ?? 'archive'}
        product={actionTarget?.product ?? null}
        onClose={() => setActionTarget(null)}
        onDone={refetch}
      />
    </Stack>
  );
}
