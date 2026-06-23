import { Alert, Avatar, Box, Chip, IconButton, Stack, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import type { EcommBrand } from './queries';

const STATUS_COLOR: Record<string, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
  DRAFT: 'warning',
  SUBMITTED: 'info',
  APPROVED: 'success',
  REJECTED: 'error',
};

interface Props {
  brands: EcommBrand[];
  onOpen: (brand: EcommBrand) => void;
}

export default function PartnerBrandsTable({ brands, onOpen }: Readonly<Props>) {
  if (brands.length === 0) {
    return <Alert severity="info">No brands yet — create your first product brand to get started.</Alert>;
  }
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Brand</TableCell>
          <TableCell>Categories</TableCell>
          <TableCell>Status</TableCell>
          <TableCell align="right">Action</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {brands.map((brand) => {
          const locked = brand.status === 'SUBMITTED' || brand.status === 'APPROVED';
          return (
            <TableRow key={brand.id} hover sx={{ cursor: 'pointer' }} onClick={() => onOpen(brand)}>
              <TableCell>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Avatar src={brand.logo_url || undefined} variant="rounded" sx={{ width: 32, height: 32 }}>
                    {(brand.brand_name || '?').charAt(0).toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" fontWeight={700}>{brand.brand_name || 'Untitled brand'}</Typography>
                    <Typography variant="caption" color="text.secondary">{brand.tagline || '—'}</Typography>
                  </Box>
                </Stack>
              </TableCell>
              <TableCell>
                <Typography variant="body2">{(brand.product_categories ?? []).join(', ') || '—'}</Typography>
              </TableCell>
              <TableCell><Chip size="small" color={STATUS_COLOR[brand.status]} label={brand.status} /></TableCell>
              <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                <Tooltip title={locked ? 'View' : 'Edit'}>
                  <IconButton size="small" onClick={() => onOpen(brand)}>
                    {locked ? <VisibilityIcon fontSize="small" /> : <EditIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
