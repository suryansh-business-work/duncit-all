import EditIcon from '@mui/icons-material/Edit';
import RateReviewIcon from '@mui/icons-material/RateReview';
import { Avatar, Box, Chip, IconButton, Stack, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from '@mui/material';

interface Props {
  brands: any[];
  onEdit: (brand: any) => void;
  onReview: (brand: any) => void;
}

export default function EcommBrandsTable({ brands, onEdit, onReview }: Readonly<Props>) {
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Brand</TableCell>
          <TableCell>Categories</TableCell>
          <TableCell>Owner</TableCell>
          <TableCell>Status</TableCell>
          <TableCell>Submitted</TableCell>
          <TableCell align="right">Actions</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {brands.map((brand) => (
          <TableRow key={brand.id} hover>
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
            <TableCell>
              <Typography variant="body2">{brand.contact_person || '—'}</Typography>
              <Typography variant="caption" color="text.secondary">{brand.contact_email || brand.contact_phone || '—'}</Typography>
            </TableCell>
            <TableCell><Chip size="small" label={brand.status} /></TableCell>
            <TableCell>{brand.submitted_at ? new Date(brand.submitted_at).toLocaleDateString() : '—'}</TableCell>
            <TableCell align="right">
              <Tooltip title="Edit">
                <IconButton size="small" onClick={() => onEdit(brand)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Review">
                <IconButton size="small" onClick={() => onReview(brand)}>
                  <RateReviewIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </TableCell>
          </TableRow>
        ))}
        {brands.length === 0 && (
          <TableRow><TableCell colSpan={6} align="center">No brands found.</TableCell></TableRow>
        )}
      </TableBody>
    </Table>
  );
}
