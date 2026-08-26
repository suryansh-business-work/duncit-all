import { Box, Stack } from '@mui/material';
import { AdminLocationSelect, type AdminLocationValue } from '@duncit/location';
import { AutoPodCategoryFilter } from '@duncit/auto-pods';
import type { AutoPodLabels } from '@duncit/utils';

export interface AutoPodFiltersProps {
  location: AdminLocationValue;
  onLocationChange: (value: AdminLocationValue) => void;
  labels: AutoPodLabels;
  /** Host page only: narrow to one of the host's approved sub-categories. */
  showCategory?: boolean;
  /** Chosen sub-category id, '' for all (only read when `showCategory`). */
  category?: string;
  onCategoryChange?: (subCategoryId: string) => void;
}

/**
 * The filter row every Auto Pod queue opens with: the admin Location cascade
 * (Country > State > City) on all three pages, plus the host's own approved
 * sub-categories on the host page. A chosen city narrows the queue to offers
 * pinned there and every offer nobody has pinned yet.
 */
export default function AutoPodFilters({
  location,
  onLocationChange,
  labels,
  showCategory = false,
  category = '',
  onCategoryChange,
}: Readonly<AutoPodFiltersProps>) {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={1.5}
      useFlexGap
      sx={{ alignItems: { xs: 'stretch', md: 'flex-start' } }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <AdminLocationSelect
          value={location}
          onChange={onLocationChange}
          fields={['country', 'state', 'city']}
          direction="row"
          size="small"
        />
      </Box>
      {showCategory ? (
        <Box sx={{ width: { xs: '100%', md: 320 } }}>
          <AutoPodCategoryFilter
            value={category}
            onChange={(id) => onCategoryChange?.(id)}
            labels={labels}
            size="small"
          />
        </Box>
      ) : null}
    </Stack>
  );
}
