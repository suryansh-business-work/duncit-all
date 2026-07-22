import {
  Box,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { ProductListingRow } from './requestsQueries';
import { deliveryTargetLabel } from './deliveryTarget';

interface Props {
  row: ProductListingRow;
}

/** Everything the partner submitted, laid out for the reviewer: image gallery,
 * description, option definitions and the full per-variant matrix — approvals
 * must never be blind to what will actually go on sale. */
export default function ListingReviewDetails({ row }: Readonly<Props>) {
  const fallbackImages = row.image_url ? [row.image_url] : [];
  const images = row.images?.length ? row.images : fallbackImages;
  const hasVariants = (row.variants ?? []).length > 0;

  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        {row.listing_submitted_by_name || 'Partner'}
        {row.brand_name ? ` · ${row.brand_name}` : ''} · {row.inventory_count} units · ₹
        {row.unit_cost} · {deliveryTargetLabel(row.delivery_target)}
      </Typography>

      {images.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 0.5 }}>
          {images.map((url) => (
            <Box
              key={url}
              component="img"
              src={url}
              alt={row.product_name}
              sx={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 1.5, flex: '0 0 auto' }}
            />
          ))}
        </Stack>
      )}

      {row.description && (
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
          {row.description}
        </Typography>
      )}

      {(row.options ?? []).length > 0 && (
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
          {row.options.map((option) => (
            <Chip
              key={option.name}
              size="small"
              label={`${option.name}: ${option.values.join(', ')}`}
            />
          ))}
        </Stack>
      )}

      {hasVariants && (
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small" aria-label="Variants">
            <TableHead>
              <TableRow>
                <TableCell>Variant</TableCell>
                <TableCell>SKU</TableCell>
                <TableCell align="right">Price</TableCell>
                <TableCell align="right">Stock</TableCell>
                <TableCell align="right">Weight</TableCell>
                <TableCell>Images</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {row.variants.map((variant) => (
                <TableRow key={variant.id}>
                  <TableCell>{variant.option_label || variant.size_label || 'Default'}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{variant.sku}</TableCell>
                  <TableCell align="right">₹{variant.unit_cost}</TableCell>
                  <TableCell align="right">{variant.inventory_count}</TableCell>
                  <TableCell align="right">{variant.weight_kg} kg</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      {(variant.images ?? []).slice(0, 3).map((url) => (
                        <Box
                          key={url}
                          component="img"
                          src={url}
                          alt={variant.option_label}
                          sx={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 0.75 }}
                        />
                      ))}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      {!hasVariants && (
        <Typography variant="body2" color="text.secondary">
          {row.size_label} · {row.color} · {row.height_cm}cm · {row.weight_kg}kg
        </Typography>
      )}
    </Stack>
  );
}
