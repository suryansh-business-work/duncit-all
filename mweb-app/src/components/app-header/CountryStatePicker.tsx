import { useMemo, useState } from 'react';
import {
  Box,
  Chip,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import type { CountryNode } from '../../utils/location-tree';
import { countryFlagUrl } from '../../utils/location-tree';

interface Props {
  tree: CountryNode[];
  country: string;
  state: string;
  onCountry: (country: string) => void;
  onState: (state: string) => void;
}

const chipSx = (active: boolean) => ({
  height: 34,
  borderRadius: 999,
  fontWeight: 800,
  border: 1,
  borderColor: active ? 'primary.main' : 'divider',
  bgcolor: (theme: Theme) =>
    active
      ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.2 : 0.12)
      : 'background.paper',
  color: active ? 'primary.main' : 'text.primary',
});

export default function CountryStatePicker({ tree, country, state, onCountry, onState }: Props) {
  const [stateQuery, setStateQuery] = useState('');
  const activeCountry = tree.find((c) => c.country === country) ?? tree[0];
  const states = useMemo(() => {
    const term = stateQuery.trim().toLowerCase();
    const all = activeCountry?.states ?? [];
    if (!term) return all;
    return all.filter((s) => s.state.toLowerCase().includes(term));
  }, [activeCountry, stateQuery]);

  if (tree.length === 0) return null;

  return (
    <Stack spacing={1} sx={{ mb: 1.5 }}>
      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 900, lineHeight: 1.4 }}>
        Country
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 0.5, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
        {tree.map((c) => {
          const flag = countryFlagUrl(c.country_code);
          return (
            <Chip
              key={c.country}
              onClick={() => onCountry(c.country)}
              avatar={flag ? <Box component="img" src={flag} alt="" sx={{ width: 22, height: 16, borderRadius: 0.5 }} /> : undefined}
              label={c.country}
              sx={chipSx(c.country === activeCountry?.country)}
            />
          );
        })}
      </Box>

      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 900, lineHeight: 1.4 }}>
          State
        </Typography>
        {(activeCountry?.states.length ?? 0) > 6 && (
          <TextField
            size="small"
            placeholder="Search state"
            value={stateQuery}
            onChange={(e) => setStateQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ width: 190, '& .MuiOutlinedInput-root': { minHeight: 36, borderRadius: 999, bgcolor: 'action.hover' }, '& input': { fontSize: 13 } }}
          />
        )}
      </Stack>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
        {states.map((s) => (
          <Chip
            key={s.state}
            onClick={() => onState(s.state)}
            label={s.state}
            size="small"
            sx={chipSx(s.state === state)}
          />
        ))}
        {states.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No matching states.
          </Typography>
        )}
      </Box>
    </Stack>
  );
}
