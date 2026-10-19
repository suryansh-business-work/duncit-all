import { Box, Stack, Typography } from '@mui/material';

import type { StoreSectionItem } from '../../../../graphql/catalog';
import { ItemIcon } from '../ItemIcon';

const MAX_POINTS = 4;

/** The page's first USP points as a compact row under the hero's words. */
export function TrustRow({ items }: Readonly<{ items: readonly StoreSectionItem[] }>) {
  const points = items.slice(0, MAX_POINTS);
  if (points.length === 0) return null;
  return (
    <Box
      component="ul"
      sx={{ listStyle: 'none', p: 0, m: 0, pt: 1, display: 'grid', gap: 1.5, gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', lg: `repeat(${points.length}, minmax(0, 1fr))` } }}
    >
      {points.map((item) => (
        <Stack component="li" key={item.id} direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
          <ItemIcon src={item.image_url} plate={36} icon={24} />
          <Typography variant="body2" sx={{ fontWeight: 800, minWidth: 0 }}>
            {item.title}
          </Typography>
        </Stack>
      ))}
    </Box>
  );
}
