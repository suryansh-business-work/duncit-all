import { Box, Divider, Stack, Typography } from '@mui/material';
import type { ProductSpec } from '../product-specs';

/** The bordered label/value rows of a product's physical specs. */
export default function ProductSpecsTable({ specs }: Readonly<{ specs: ProductSpec[] }>) {
  return (
    <Box data-testid="product-detail-specs" sx={{ border: 1, borderColor: 'divider', borderRadius: '16px', overflow: 'hidden' }}>
      {specs.map((spec, specIndex) => (
        <Box key={spec.label}>
          {specIndex > 0 && <Divider />}
          <Stack
            direction="row"
            sx={{
              justifyContent: "space-between",
              px: 1.5,
              py: 1
            }}>
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                fontWeight: 700
              }}>
              {spec.label}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {spec.value}
            </Typography>
          </Stack>
        </Box>
      ))}
    </Box>
  );
}
