import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Chip,
  CircularProgress,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { MARKETPLACE_BRANDS } from './queries';

const BRAND_STATUS_COLOR: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  APPROVED: 'success',
  SUBMITTED: 'warning',
  DRAFT: 'default',
  REJECTED: 'error',
};

const STATUS_FILTERS = ['APPROVED', 'SUBMITTED', 'DRAFT', 'REJECTED'];

export default function EcommMarketplacePage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('APPROVED');
  const { data, loading, error } = useQuery(MARKETPLACE_BRANDS, {
    variables: { status },
    fetchPolicy: 'cache-and-network',
  });
  const brands = data?.marketplaceBrands ?? [];

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
        <Box>
          <Typography variant="h4" fontWeight={700}>
            E-commerce brands
          </Typography>
          <Typography variant="body2" color="text.secondary">
            External seller brands, their approved catalogue size and pickup readiness.
          </Typography>
        </Box>
        <TextField
          size="small"
          select
          label="Status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          sx={{ minWidth: 180 }}
        >
          {STATUS_FILTERS.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {error && <Alert severity="error">{error.message}</Alert>}

      {loading && brands.length === 0 ? (
        <CircularProgress />
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>Brand</TableCell>
              <TableCell>Location</TableCell>
              <TableCell align="right">Approved products</TableCell>
              <TableCell>Pickup</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {brands.map((brand: any) => (
              <TableRow
                key={brand.id}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => navigate(`/ecomm/brands/${brand.id}`)}
              >
                <TableCell sx={{ width: 56 }}>
                  <Avatar src={brand.logo_url || undefined} variant="rounded" sx={{ width: 36, height: 36 }}>
                    {brand.brand_name?.[0]?.toUpperCase() ?? '?'}
                  </Avatar>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {brand.brand_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {brand.contact_email || brand.contact_phone || '—'}
                  </Typography>
                </TableCell>
                <TableCell>{[brand.city, brand.state].filter(Boolean).join(', ') || '—'}</TableCell>
                <TableCell align="right">{brand.approved_product_count}</TableCell>
                <TableCell>
                  {brand.default_pickup_location_id ? (
                    <Chip
                      size="small"
                      color="success"
                      variant="outlined"
                      icon={<CheckCircleIcon />}
                      label="Registered"
                    />
                  ) : (
                    <Chip
                      size="small"
                      color="warning"
                      variant="outlined"
                      icon={<ErrorOutlineIcon />}
                      label="No default"
                    />
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={brand.status}
                    color={BRAND_STATUS_COLOR[brand.status] ?? 'default'}
                  />
                </TableCell>
              </TableRow>
            ))}
            {brands.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Alert severity="info">No brands found for this filter.</Alert>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </Stack>
  );
}
