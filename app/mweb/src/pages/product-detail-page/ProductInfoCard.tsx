import { Box, Card, Stack, Typography } from '@mui/material';
import type { ProductSpec } from '../pod-details-page/product-specs';

interface Props {
  description: string;
  specs: readonly ProductSpec[];
}

/** The description card: the product copy, then its physical spec rows
 * (label muted, value ink) under hairline dividers. */
export default function ProductInfoCard({ description, specs }: Readonly<Props>) {
  return (
    <Card sx={{ p: 2 }}>
      <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>
        {description}
      </Typography>
      {specs.length > 0 && (
        <Box sx={{ mt: 1.5 }}>
          {specs.map((spec) => (
            <Stack
              key={spec.label}
              direction="row"
              spacing={2}
              sx={{ justifyContent: 'space-between', py: 1.25, borderTop: 1, borderColor: 'divider' }}
            >
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {spec.label}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>
                {spec.value}
              </Typography>
            </Stack>
          ))}
        </Box>
      )}
    </Card>
  );
}
