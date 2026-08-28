import { useQuery } from '@apollo/client';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import type { AutoPodLabels } from '@duncit/utils';
import { MY_HOST_CATEGORIES_FOR_AUTO_POD } from './queries';

interface HostCategory {
  sub_category_id: string | null;
  sub_category_name: string;
  category_name: string;
  super_category_name: string;
}

interface MyHostCategories {
  myHost: { host_categories: HostCategory[] } | null;
}

export interface AutoPodCategoryFilterProps {
  /** The chosen sub-category id, or '' for all of the host's categories. */
  value: string;
  onChange: (subCategoryId: string) => void;
  labels: AutoPodLabels;
  size?: 'small' | 'medium';
}

/** The blank option's value — MUI needs a real string for "all". */
const ALL = '';

/** "Super › Category › Sub" — the same path the host-apply screens print. */
const pathOf = (row: HostCategory) =>
  [row.super_category_name, row.category_name, row.sub_category_name].filter(Boolean).join(' › ');

/**
 * The host queue's category filter: the sub-categories THIS host is approved
 * in, and nothing else — the server offers a host only those anyway, so the
 * list is the host's own approvals, not the whole tree. mWeb and the Partners
 * portal render this one component; native keeps a chip-row twin over the same
 * query.
 */
export function AutoPodCategoryFilter({
  value,
  onChange,
  labels,
  size = 'small',
}: Readonly<AutoPodCategoryFilterProps>) {
  const { data, loading } = useQuery<MyHostCategories>(MY_HOST_CATEGORIES_FOR_AUTO_POD, {
    fetchPolicy: 'cache-first',
  });
  // Narrowed on the way in, so the options below read the id straight off the
  // row rather than defending against a null the filter already removed.
  const rows = (data?.myHost?.host_categories ?? []).filter(
    (row): row is HostCategory & { sub_category_id: string } => !!row.sub_category_id,
  );

  if (!loading && rows.length === 0) {
    return (
      <TextField
        select
        size={size}
        fullWidth
        label={labels.categoryLabel}
        value={ALL}
        disabled
        helperText={labels.noHostCategories}
      >
        <MenuItem value={ALL}>{labels.allCategories}</MenuItem>
      </TextField>
    );
  }

  return (
    <TextField
      select
      size={size}
      fullWidth
      label={labels.categoryLabel}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={loading}
    >
      <MenuItem value={ALL}>{labels.allCategories}</MenuItem>
      {rows.map((row) => (
        <MenuItem key={row.sub_category_id} value={row.sub_category_id}>
          {pathOf(row)}
        </MenuItem>
      ))}
    </TextField>
  );
}
