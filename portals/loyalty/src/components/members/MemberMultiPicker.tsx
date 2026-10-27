import { Autocomplete, TextField } from '@mui/material';
import type { CoinUserOption } from '../../pages/duncit-coin/queries';
import { memberLabel, useMemberSearch } from './useMemberSearch';

interface Props {
  value: CoinUserOption[];
  onChange: (next: CoinUserOption[]) => void;
  label: string;
  helperText: string;
  error?: boolean;
  disabled?: boolean;
}

/** Picks the members a batch of mapped cards is made for — one card each. */
export default function MemberMultiPicker({ value, onChange, label, helperText, error, disabled }: Readonly<Props>) {
  const { options, loading, setTerm, noOptionsText, renderOption, filterOptions } = useMemberSearch();

  return (
    <Autocomplete<CoinUserOption, true>
      multiple
      value={value}
      onChange={(_e, next) => onChange(next)}
      onInputChange={(_e, next, reason) => {
        // Picking an option clears the box; that is not a new search.
        if (reason === 'input') setTerm(next);
      }}
      options={options}
      loading={loading}
      disabled={disabled}
      getOptionLabel={memberLabel}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      filterOptions={filterOptions}
      filterSelectedOptions
      noOptionsText={noOptionsText}
      renderOption={renderOption}
      renderInput={(params) => (
        <TextField {...params} label={label} required error={error} helperText={helperText} size="small" />
      )}
    />
  );
}
