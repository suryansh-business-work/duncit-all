import { Chip, Stack } from '@mui/material';
import type { TableFilterValue } from '@duncit/table';
import { SOURCE_OPTIONS, STATUS_COLOR, STATUS_OPTIONS } from './queries';
import { useTranslation } from '@duncit/app-settings';

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
  /**
   * One template slug, or '' for all of them.
   *
   * Unlike the other two this has no chip to turn ON — thirty-five slugs is a
   * menu, not a chip row. It arrives from the send count on the Templates page
   * and shows up here as a chip that can only be taken off, so an operator who
   * followed that link can see why the table is narrowed and undo it.
   */
  template: string;
}

export const EMPTY_QUICK_FILTERS: QuickFilterState = { status: '', source: '', template: '' };

/** The quick chips translated into what the table sends the server. */
export function quickFiltersToTable(state: QuickFilterState): TableFilterValue[] {
  const filters: TableFilterValue[] = [];
  if (state.status) filters.push({ field: 'status', op: 'eq', value: state.status });
  if (state.source) filters.push({ field: 'source', op: 'eq', value: state.source });
  // `eq`, not `contains`: a slug is exact, and 'pod-cancelled' must not drag
  // in 'pod-cancelled-refund' — the count that linked here counted neither.
  if (state.template) filters.push({ field: 'template', op: 'eq', value: state.template });
  return filters;
}

interface Props {
  value: QuickFilterState;
  onChange: (next: QuickFilterState) => void;
}

export default function EmailLogQuickFilters({ value, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const narrowed = Boolean(value.status || value.source || value.template);
  return (
    <Stack
      direction="row"
      spacing={1}
      useFlexGap
      sx={{
        flexWrap: "wrap",
        mb: 1.5
      }}>
      <Chip
        label={t('tech.emailLogs.all')}
        size="small"
        color={narrowed ? 'default' : 'primary'}
        variant={narrowed ? 'outlined' : 'filled'}
        onClick={() => onChange(EMPTY_QUICK_FILTERS)}
      />
      {value.template && (
        <Chip
          label={t('tech.emailLogs.templateFilter', { vars: { slug: value.template } })}
          size="small"
          color="info"
          onDelete={() => onChange({ ...value, template: '' })}
        />
      )}
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
