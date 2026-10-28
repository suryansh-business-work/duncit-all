import { Autocomplete, TextField } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { memberLabel, useMemberSearch } from '../../components/members/useMemberSearch';
import type { CoinUserOption } from './queries';

interface Props {
  value: CoinUserOption | null;
  onChange: (next: CoinUserOption | null) => void;
  disabled?: boolean;
}

/** Finds the ONE account a manual coin adjustment is meant for. */
export default function CoinUserPicker({ value, onChange, disabled }: Readonly<Props>) {
  const { t } = useTranslation();
  const { options, loading, setTerm, noOptionsText, renderOption, filterOptions } = useMemberSearch();

  return (
    <Autocomplete<CoinUserOption>
      value={value}
      onChange={(_e, next) => onChange(next)}
      onInputChange={(_e, next) => setTerm(next)}
      options={options}
      loading={loading}
      disabled={disabled}
      getOptionLabel={memberLabel}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      filterOptions={filterOptions}
      noOptionsText={noOptionsText}
      renderOption={renderOption}
      renderInput={(params) => (
        <TextField
          {...params}
          label={t('finance.duncitCoin.user')}
          required
          size="small"
          helperText={t('finance.duncitCoin.searchByNameOrEmail')}
        />
      )}
    />
  );
}
