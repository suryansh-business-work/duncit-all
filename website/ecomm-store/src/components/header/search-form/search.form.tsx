import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@apollo/client/react';
import { Autocomplete, Box, TextField } from '@mui/material';
import { useDebouncedValue } from '@duncit/ui';

import { STORE_SUGGEST, type StoreSuggest } from '../../../graphql/catalog';
import { paths } from '../../../lib/paths';
import { useStoreT } from '../../../i18n';
import { SearchSubmit, SUBMIT_ROOM } from './SearchSubmit';
import { renderSuggestRow } from './SuggestRow';
import { searchSchema, type SearchValues, type SuggestOption } from './search.types';

const MIN_CHARS = 2;

/** A tall rounded field with the red search button sitting inside its right end. */
const FORM_SX = {
  width: '100%',
  position: 'relative',
  '& .MuiAutocomplete-inputRoot.MuiOutlinedInput-root': { minHeight: 52, pl: 2.5, pr: `${SUBMIT_ROOM}px` },
  '& .MuiAutocomplete-endAdornment': { right: `${SUBMIT_ROOM - 4}px` },
} as const;

function toOptions(found: StoreSuggest | undefined, q: string, searchLabel: string): SuggestOption[] {
  if (!q) return [];
  const query: SuggestOption = { kind: 'query', id: `q:${q}`, label: searchLabel, to: paths.search(q) };
  if (!found) return [query];
  return [
    ...found.products.map((p): SuggestOption => ({
      kind: 'product',
      id: p.id,
      label: p.title,
      to: paths.product(p.slug),
      image: p.image_url,
    })),
    ...found.categories.map((c): SuggestOption => ({ kind: 'category', id: c.id, label: c.name, to: paths.category(c.slug) })),
    ...found.brands.map((b): SuggestOption => ({ kind: 'brand', id: b.id, label: b.name, to: paths.brand(b.slug) })),
    query,
  ];
}

interface SearchFormProps {
  /** Called after navigating away — the mobile drawer closes itself. */
  onDone?: () => void;
  id: string;
}

/** Store search with a debounced type-ahead of products, aisles and brands. */
export function SearchForm({ onDone, id }: Readonly<SearchFormProps>) {
  const { t } = useStoreT();
  const navigate = useNavigate();
  const { control, handleSubmit, watch, reset } = useForm<SearchValues>({
    resolver: zodResolver(searchSchema),
    defaultValues: { q: '' },
  });
  const typed = watch('q').trim();
  const debounced = useDebouncedValue(typed, 250);
  const { data } = useQuery(STORE_SUGGEST, {
    variables: { q: debounced },
    skip: debounced.length < MIN_CHARS,
  });
  const searchLabel = t('ecommStore.search.searchFor', { vars: { q: typed } });
  const options = useMemo(
    () => toOptions(debounced.length >= MIN_CHARS ? data?.storeSuggest : undefined, typed, searchLabel),
    [data, debounced, typed, searchLabel],
  );

  const go = (to: string) => {
    navigate(to);
    reset({ q: '' });
    onDone?.();
  };
  const submit = handleSubmit(({ q }) => {
    if (q) go(paths.search(q));
  });

  return (
    <Box component="form" role="search" onSubmit={submit} sx={FORM_SX} noValidate>
      <Controller
        control={control}
        name="q"
        render={({ field }) => (
          <Autocomplete<SuggestOption, false, false, true>
            id={id}
            freeSolo
            options={options}
            filterOptions={(list) => list}
            getOptionLabel={(option) => (typeof option === 'string' ? option : option.label)}
            inputValue={field.value}
            onInputChange={(_event, value, reason) => {
              if (reason === 'input' || reason === 'clear') field.onChange(value);
            }}
            onChange={(_event, value) => {
              if (value && typeof value !== 'string') go(value.to);
            }}
            renderOption={renderSuggestRow}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder={t('ecommStore.search.placeholder')}
                slotProps={{
                  ...params.slotProps,
                  htmlInput: { ...params.slotProps.htmlInput, 'aria-label': t('ecommStore.search.label') },
                }}
              />
            )}
          />
        )}
      />
      <SearchSubmit />
    </Box>
  );
}
