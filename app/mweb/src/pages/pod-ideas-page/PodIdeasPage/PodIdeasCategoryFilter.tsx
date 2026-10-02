import { Stack, Typography } from '@mui/material';
import CategoryCascade, { type CategoryScope } from '../CategoryCascade';

/** The "Filter by category" cascade above the ideas list. */
export default function PodIdeasCategoryFilter({
  value,
  onChange,
}: Readonly<{ value: CategoryScope; onChange: (next: CategoryScope) => void }>) {
  return (
    <Stack data-testid="pod-ideas-page-filter" spacing={0.75} sx={{ mb: 2 }}>
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          fontWeight: 700
        }}>
        Filter by category
      </Typography>
      <CategoryCascade value={value} onChange={onChange} allowAll />
    </Stack>
  );
}
