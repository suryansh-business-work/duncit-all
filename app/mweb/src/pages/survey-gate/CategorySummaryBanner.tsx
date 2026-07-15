import { Box, Chip, Stack, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import type { CategoryLabels } from './CategoryStep';

const summary = (labels: CategoryLabels) =>
  [labels.super, labels.category, labels.sub].filter(Boolean).join(' › ');

/**
 * Read-only recap of the chosen Super › Category › Sub shown at the top of the
 * survey + meeting steps, with a "Change" affordance that returns to the picker.
 * The native twin is survey-onboarding/CategorySummaryBanner.
 */
export default function CategorySummaryBanner({
  labels,
  onChange,
}: Readonly<{ labels: CategoryLabels; onChange: () => void }>) {
  const text = summary(labels);
  if (!text) return null;
  return (
    <Box
      data-testid="category-banner"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1,
        p: 1.25,
        mb: 1.5,
        borderRadius: 2,
        bgcolor: 'action.hover',
      }}
    >
      <Stack spacing={0} sx={{ minWidth: 0 }}>
        <Typography variant="caption" fontWeight={800} color="text.secondary">
          CATEGORY
        </Typography>
        <Typography variant="body2" fontWeight={700} noWrap>
          {text}
        </Typography>
      </Stack>
      <Chip
        icon={<EditIcon />}
        label="Change"
        onClick={onChange}
        size="small"
        variant="outlined"
        color="primary"
        sx={{ fontWeight: 800, flexShrink: 0 }}
      />
    </Box>
  );
}
