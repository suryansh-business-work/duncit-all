import { Chip, Stack } from '@mui/material';
import type { TableFilterValue } from '@duncit/table';
import { SOURCE_OPTIONS, STATUS_COLOR, STATUS_OPTIONS } from './queries';

/**
 * The two questions this page is opened with, one click each.
 *
 * The toolbar's own Filters cover everything; these cover the two that are
 * asked every time — "what failed" and "was that us or the app" — because
 * three clicks into a filter menu is where an operator gives up and greps.
 */
export interface QuickFilterState {
  /** '' means every status. */
  status: string;
  /** '' means every surface. */
  source: string;
}

export const EMPTY_QUICK_FILTERS: QuickFilterState = { status: '', source: '' };

/** The quick chips translated into what the table sends the server. */
export function quickFiltersToTable(state: QuickFilterState): TableFilterValue[] {
  const filters: TableFilterValue[] = [];
  if (state.status) filters.push({ field: 'status', op: 'eq', value: state.status });
  if (state.source) filters.push({ field: 'source', op: 'eq', value: state.source });
  return filters;
}

interface Props {
  value: QuickFilterState;
  onChange: (next: QuickFilterState) => void;
}

export default function EmailLogQuickFilters({ value, onChange }: Readonly<Props>) {
  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
      <Chip
        label="All"
        size="small"
        color={value.status || value.source ? 'default' : 'primary'}
        variant={value.status || value.source ? 'outlined' : 'filled'}
        onClick={() => onChange(EMPTY_QUICK_FILTERS)}
      />
      {STATUS_OPTIONS.map((option) => {
        const on = value.status === option.value;
        return (
          <Chip
            key={option.value}
            label={option.label}
            size="small"
            color={on ? STATUS_COLOR[option.value] : 'default'}
            variant={on ? 'filled' : 'outlined'}
            // Clicking the chip that is already on clears it, so the same
            // gesture both asks and un-asks.
            onClick={() => onChange({ ...value, status: on ? '' : option.value })}
          />
        );
      })}
      {SOURCE_OPTIONS.map((option) => {
        const on = value.source === option.value;
        return (
          <Chip
            key={option.value}
            label={option.label}
            size="small"
            color={on ? 'primary' : 'default'}
            variant={on ? 'filled' : 'outlined'}
            onClick={() => onChange({ ...value, source: on ? '' : option.value })}
          />
        );
      })}
    </Stack>
  );
}
