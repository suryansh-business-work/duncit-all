import { InputAdornment, MenuItem, Stack, TextField } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useTranslation } from '@duncit/app-settings';
import {
  statusOptionsFor,
  type SidebarOption,
  type SidebarSort,
  type SidebarStatus,
} from './sidebar-view';

/**
 * The extra select a page adds when its rows belong to buckets — Templates
 * narrows by the header/footer wrapped around them, which is how the Fragments
 * page links here to answer "where is this fragment consumed?".
 */
export interface SidebarFilter {
  label: string;
  /** '' means every bucket. */
  value: string;
  allLabel: string;
  options: SidebarOption<string>[];
  onChange: (value: string) => void;
}

interface Props {
  search: string;
  onSearch: (value: string) => void;
  searchPlaceholder: string;
  sort: SidebarSort;
  onSort: (value: SidebarSort) => void;
  sortOptions: SidebarOption<SidebarSort>[];
  status: SidebarStatus;
  onStatus: (value: SidebarStatus) => void;
  filter?: SidebarFilter;
}

/**
 * Search, sort and the status filter, above the rows they narrow.
 *
 * Every control is a labelled select rather than a menu behind an icon: with
 * thirty-odd templates the question is usually "which of these has never been
 * sent" or "which are switched off", and an answer hidden behind a glyph is an
 * answer nobody finds.
 */
export default function SidebarToolbar({
  search,
  onSearch,
  searchPlaceholder,
  sort,
  onSort,
  sortOptions,
  status,
  onStatus,
  filter,
}: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1}>
      <TextField
        size="small"
        fullWidth
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder={searchPlaceholder}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />
      <Stack direction="row" spacing={1}>
        <TextField
          select
          size="small"
          label={t('tech.emailSidebar.sort')}
          value={sort}
          onChange={(e) => onSort(e.target.value as SidebarSort)}
          sx={{ flex: 1, minWidth: 0 }}
        >
          {sortOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label={t('shell.common.status')}
          value={status}
          onChange={(e) => onStatus(e.target.value as SidebarStatus)}
          sx={{ flex: 1, minWidth: 0 }}
        >
          {statusOptionsFor(t).map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      {filter && (
        <TextField
          select
          size="small"
          fullWidth
          label={filter.label}
          value={filter.value}
          onChange={(e) => filter.onChange(e.target.value)}
        >
          <MenuItem value="">{filter.allLabel}</MenuItem>
          {filter.options.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      )}
    </Stack>
  );
}
