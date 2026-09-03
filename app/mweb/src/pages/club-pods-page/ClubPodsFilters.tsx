import { useMemo } from 'react';
import { InputAdornment, MenuItem, Stack, TextField } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { podRowStatusOptions, type PodRowStatusFilter } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  search: string;
  onSearch: (value: string) => void;
  status: PodRowStatusFilter;
  onStatus: (value: PodRowStatusFilter) => void;
}

/**
 * The search box and the status select over the club's pods. Both are query
 * arguments, so the server pages over the matching pods rather than the list
 * filtering the page it already fetched — and the status vocabulary is the one
 * `@duncit/utils` gives every surface, so a pod is filtered under the same
 * name it is chipped with.
 */
export default function ClubPodsFilters({ search, onSearch, status, onStatus }: Readonly<Props>) {
  const { t } = useTranslation();
  const options = useMemo(() => podRowStatusOptions(t), [t]);

  return (
    <Stack direction="row" spacing={1}>
      <TextField
        size="small"
        fullWidth
        value={search}
        onChange={(event) => onSearch(event.target.value)}
        placeholder={t('mweb.common.search')}
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
      <TextField
        select
        size="small"
        label={t('clubAdmin.pods.statusFilter')}
        value={status}
        onChange={(event) => onStatus(event.target.value as PodRowStatusFilter)}
        sx={{ minWidth: 150 }}
      >
        {options.map((option) => (
          <MenuItem key={option.label} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  );
}
