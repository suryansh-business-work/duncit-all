import {
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useTranslation } from '../i18n';

export type StatusFilterValue = 'all' | 'operational' | 'issues';

export interface FilterState {
  query: string;
  status: StatusFilterValue;
  group: string;
}

interface FiltersProps {
  value: FilterState;
  groupTitles: string[];
  onChange: (next: FilterState) => void;
}

export default function StatusFilters({ value, groupTitles, onChange }: Readonly<FiltersProps>) {
  const { t } = useTranslation();
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      sx={{
        alignItems: { xs: 'stretch', sm: 'center' },
        mb: 3
      }}>
      <TextField
        size="small"
        placeholder={t('status.board.search')}
        value={value.query}
        onChange={(event) => onChange({ ...value, query: event.target.value })}
        sx={{ flex: 1 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },

          htmlInput: { 'aria-label': t('status.board.searchAria') }
        }} />
      <TextField
        size="small"
        select
        label={t('status.board.group')}
        value={value.group}
        onChange={(event) => onChange({ ...value, group: event.target.value })}
        sx={{ minWidth: 140 }}
      >
        <MenuItem value="all">{t('status.board.allGroups')}</MenuItem>
        {groupTitles.map((title) => (
          <MenuItem key={title} value={title}>
            {title}
          </MenuItem>
        ))}
      </TextField>
      <ToggleButtonGroup
        size="small"
        exclusive
        value={value.status}
        onChange={(_event, next: StatusFilterValue | null) => {
          if (next !== null) onChange({ ...value, status: next });
        }}
        aria-label={t('status.board.filterByStatus')}
      >
        <ToggleButton value="all">{t('status.board.allStatuses')}</ToggleButton>
        <ToggleButton value="operational">{t('status.board.operational')}</ToggleButton>
        <ToggleButton value="issues">{t('status.board.issues')}</ToggleButton>
      </ToggleButtonGroup>
    </Stack>
  );
}
