import { useQuery } from '@apollo/client';
import { Card, Chip, Stack, Typography } from '@mui/material';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import { MY_HOST_CATEGORIES, formatCategoryPath, type HostCategory } from './queries';

/**
 * "Your hosting categories" — the Super › Category › Sub paths the host is approved
 * to operate in. Rendered near the top of Host Studio. Hidden entirely when empty.
 */
export default function HostCategoriesCard() {
  const { data } = useQuery<{ myHost: { host_categories: HostCategory[] } | null }>(
    MY_HOST_CATEGORIES,
    { fetchPolicy: 'cache-and-network' },
  );
  const categories = data?.myHost?.host_categories ?? [];
  if (categories.length === 0) return null;

  return (
    <Card variant="outlined" sx={{ borderRadius: '16px', p: { xs: 2, sm: 2.5 } }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: "center",
          mb: 1.25
        }}>
        <CategoryRoundedIcon fontSize="small" color="primary" />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Your hosting categories
        </Typography>
      </Stack>
      <Stack direction="row" useFlexGap spacing={1} sx={{
        flexWrap: "wrap"
      }}>
        {categories.map((cat) => {
          const path = formatCategoryPath(cat);
          return <Chip key={path} label={path} sx={{ fontWeight: 600 }} />;
        })}
      </Stack>
    </Card>
  );
}
