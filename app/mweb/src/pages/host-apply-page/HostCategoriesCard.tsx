import { useQuery } from '@apollo/client/react';
import { Card, Chip, Stack, Typography } from '@mui/material';
import { MY_HOST_CATEGORIES, formatCategoryPath, type HostCategory } from './queries';

/**
 * "Your hosting categories" — the Super › Category › Sub paths the host is approved
 * to operate in, as soft pills. Rendered near the top of Host Studio. Hidden
 * entirely when empty. Native twin: components/host-manage/HostCategoriesCard.
 */
export default function HostCategoriesCard() {
  const { data } = useQuery<{ myHost: { host_categories: HostCategory[] } | null }>(
    MY_HOST_CATEGORIES,
    { fetchPolicy: 'cache-and-network' },
  );
  const categories = data?.myHost?.host_categories ?? [];
  if (categories.length === 0) return null;

  return (
    <Card data-testid="host-categories-card" sx={{ p: 2 }}>
      <Typography sx={{ fontSize: '1rem', fontWeight: 600, mb: 1.5 }}>
        Your hosting categories
      </Typography>
      <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: 'wrap' }}>
        {categories.map((cat) => {
          const path = formatCategoryPath(cat);
          return <Chip key={path} data-testid="host-category-row" label={path} />;
        })}
      </Stack>
    </Card>
  );
}
