import { useEffect, useMemo, useRef, useState } from 'react';
import { Autocomplete, Stack, TextField, Typography } from '@mui/material';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import { notifyError } from '@duncit/dialogs';
import { useWebT } from '../../../../shared/i18n';
import { loadPlaces, resolvePlace, suggestPlaces, type PickedPlace, type PlaceSuggestion } from '../../../lib/googleMaps';

/** Wait for a pause in typing before asking Google, and only from the third character. */
const DEBOUNCE_MS = 300;
const MIN_CHARS = 3;

interface PlaceSearchProps {
  apiKey: string;
  onPick: (place: PickedPlace) => void;
  /** Google could not be reached (bad key, blocked script): the form falls back to typed fields. */
  onUnavailable: () => void;
}

/** "Search for a venue or address": Google's suggestions as the host types; a pick fills the venue. */
export function PlaceSearch({ apiKey, onPick, onUnavailable }: Readonly<PlaceSearchProps>) {
  const { t } = useWebT();
  const [input, setInput] = useState('');
  const [options, setOptions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const session = useRef<unknown>(null);
  const places = useMemo(() => loadPlaces(apiKey), [apiKey]);

  useEffect(() => {
    if (input.trim().length < MIN_CHARS) {
      setOptions([]);
      return undefined;
    }
    let live = true;
    const timer = setTimeout(() => {
      setLoading(true);
      places
        .then(async (lib) => {
          session.current ??= new lib.AutocompleteSessionToken();
          const found = await suggestPlaces(lib, input, session.current);
          if (live) setOptions(found);
        })
        .catch(() => {
          if (live) onUnavailable();
        })
        .finally(() => {
          if (live) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [input, places, onUnavailable]);

  const pick = async (suggestion: PlaceSuggestion | null) => {
    if (!suggestion) return;
    session.current = null;
    try {
      onPick(await resolvePlace(suggestion));
    } catch {
      notifyError(t('liteWeb.eventForm.placeFailed'));
    }
  };

  return (
    <Autocomplete<PlaceSuggestion, false, false, false>
      options={options}
      loading={loading}
      filterOptions={(all) => all}
      getOptionLabel={(option) => option.main}
      isOptionEqualToValue={(a, b) => a.placeId === b.placeId}
      inputValue={input}
      onInputChange={(_event, value) => setInput(value)}
      onChange={(_event, value) => {
        pick(value).catch(() => notifyError(t('liteWeb.eventForm.placeFailed')));
      }}
      noOptionsText={input.trim().length < MIN_CHARS ? t('liteWeb.eventForm.placeTypeMore') : t('liteWeb.eventForm.placeNone')}
      loadingText={t('lite.common.loading')}
      renderOption={({ key, ...props }, option) => (
        <li key={key} {...props}>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
            <PlaceOutlinedIcon fontSize="small" color="action" aria-hidden />
            <Stack>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {option.main}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {option.secondary}
              </Typography>
            </Stack>
          </Stack>
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={t('liteWeb.eventForm.placeSearch')}
          placeholder={t('liteWeb.eventForm.placeSearchHint')}
          slotProps={{ ...params.slotProps, htmlInput: { ...params.slotProps.htmlInput, 'data-testid': 'event-place-search' } }}
        />
      )}
      data-testid="place-search"
    />
  );
}
