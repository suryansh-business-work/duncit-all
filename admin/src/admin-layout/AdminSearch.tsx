import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Autocomplete,
  Box,
  Chip,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import { createFilterOptions } from '@mui/material/Autocomplete';
import SearchIcon from '@mui/icons-material/Search';
import { ADMIN_SEARCH_ITEMS, type AdminSearchItem } from './adminSearchConfig';

const filterOptions = createFilterOptions<AdminSearchItem>({
  stringify: (option) => `${option.title} ${option.description} ${option.to} ${option.keywords.join(' ')}`,
});

const slashToken = (value: string) => value.trim().match(/^\/([a-z0-9-]+)/i)?.[1] ?? '';

export default function AdminSearch() {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState('');
  const pathToken = slashToken(inputValue);

  return (
    <Autocomplete
      size="small"
      options={ADMIN_SEARCH_ITEMS}
      value={null}
      inputValue={inputValue}
      filterOptions={(options, state) => {
        const token = slashToken(state.inputValue);
        const inputValue = token || state.inputValue;
        return filterOptions(options, { ...state, inputValue });
      }}
      getOptionLabel={(option) => option.title}
      onInputChange={(_, nextValue) => setInputValue(nextValue)}
      onChange={(_, option) => {
        if (!option) return;
        setInputValue('');
        navigate(option.to);
      }}
      noOptionsText="No matching module"
      sx={{
        width: '100%',
        maxWidth: { xs: '100%', sm: 420, lg: 560 },
        '& .MuiInputBase-root': { bgcolor: 'background.default' },
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder="Search admin modules"
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
                {pathToken && <Chip size="small" label={pathToken} sx={{ ml: 0.75 }} />}
              </InputAdornment>
            ),
          }}
        />
      )}
      renderOption={(props, option) => (
        <Box component="li" {...props} key={option.to} sx={{ alignItems: 'flex-start' }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={700} noWrap>
              {option.title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {option.description} · {option.to}
            </Typography>
          </Box>
        </Box>
      )}
    />
  );
}