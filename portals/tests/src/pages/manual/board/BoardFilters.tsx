import { InputAdornment, Stack, TextField } from '@mui/material';
import FilterAltOffOutlinedIcon from '@mui/icons-material/FilterAltOffOutlined';
import SearchIcon from '@mui/icons-material/Search';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { useCaseOptions } from '../shared/useCaseOptions';
import { MANUAL_LIMITS } from '../shared/vocabulary';
import type { BoardFilterValues } from '../shared/types';
import { FilterSelect } from './FilterSelect';
import LabelFilter from './LabelFilter';

interface Props {
  values: BoardFilterValues;
  active: boolean;
  onChange: (field: keyof BoardFilterValues, value: string) => void;
  onClear: () => void;
}

/**
 * The board's filter bar. Every value lives in the URL, so a filtered board can
 * be shared; the page debounces the search before it reaches the server.
 */
export default function BoardFilters({ values, active, onChange, onClear }: Readonly<Props>) {
  const { t } = useTranslation();
  const options = useCaseOptions();

  return (
    <Stack
      direction="row"
      useFlexGap
      spacing={1.5}
      sx={{ flexWrap: 'wrap', alignItems: 'center' }}
      role="search"
      aria-label={t('testsManual.filters.label')}
    >
      <TextField
        size="small"
        value={values.search}
        onChange={(event) => onChange('search', event.target.value)}
        label={t('testsManual.filters.search')}
        placeholder={t('testsManual.filters.searchPlaceholder')}
        slotProps={{
          htmlInput: { maxLength: MANUAL_LIMITS.searchMax },
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />
      <FilterSelect
        label={t('testsManual.field.assignee')}
        value={values.assignee}
        options={options.people}
        onChange={(value) => onChange('assignee', value)}
      />
      <FilterSelect
        label={t('testsManual.field.type')}
        value={values.type}
        options={options.types}
        onChange={(value) => onChange('type', value)}
      />
      <FilterSelect
        label={t('testsManual.field.priority')}
        value={values.priority}
        options={options.priorities}
        onChange={(value) => onChange('priority', value)}
      />
      <LabelFilter value={values.label} onChange={(value) => onChange('label', value)} />
      <FilterSelect
        label={t('testsManual.field.surface')}
        value={values.surface}
        options={options.surfaces}
        onChange={(value) => onChange('surface', value)}
      />
      {active ? (
        <DuncitButton size="small" startIcon={<FilterAltOffOutlinedIcon />} onClick={onClear}>
          {t('testsManual.filters.clear')}
        </DuncitButton>
      ) : null}
    </Stack>
  );
}
