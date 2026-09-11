import { useMemo, useState } from 'react';
import {
  Box,
  Chip,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import type { CountryNode } from '../../utils/location-tree';
import { countryFlagUrl } from '../../utils/location-tree';
import LocationSectionLabel from './LocationSectionLabel';
import { SHEET_SEARCH_SX } from './locationSheetSx';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  tree: CountryNode[];
  country: string;
  state: string;
  onCountry: (country: string) => void;
  onState: (state: string) => void;
}

/** A filter pill: surface on the sheet's ground, green when chosen. */
const chipSx = (active: boolean) => {
  const bgcolor = active ? 'primary.main' : 'background.paper';
  return {
    height: 36,
    px: 0.5,
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 600,
    border: '1px solid',
    borderColor: active ? 'primary.main' : 'var(--duncit-card-border)',
    bgcolor,
    color: active ? 'primary.contrastText' : 'text.primary',
    '&:hover': { bgcolor },
  };
};

export default function CountryStatePicker({ tree, country, state, onCountry, onState }: Readonly<Props>) {
  const { t } = useTranslation();
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
    <Stack spacing={2}>
      <Box>
        <LocationSectionLabel>Country</LocationSectionLabel>
        <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 0.5, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
          {tree.map((c) => {
            const flag = countryFlagUrl(c.country_code);
            return (
              <Chip
                key={c.country}
                onClick={() => onCountry(c.country)}
                avatar={flag ? <Box component="img" src={flag} alt="" sx={{ width: 22, height: 16, borderRadius: '4px' }} /> : undefined}
                label={c.country}
                sx={chipSx(c.country === activeCountry?.country)}
              />
            );
          })}
        </Box>
      </Box>

      <Box>
        <LocationSectionLabel>State</LocationSectionLabel>
        {(activeCountry?.states.length ?? 0) > 6 && (
          <TextField
            size="small"
            fullWidth
            placeholder={t('mweb.common.searchState')}
            value={stateQuery}
            onChange={(e) => setStateQuery(e.target.value)}
            sx={{ ...SHEET_SEARCH_SX, mb: 1 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }
            }}
          />
        )}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
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
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              No matching states.
            </Typography>
          )}
        </Box>
      </Box>
    </Stack>
  );
}
