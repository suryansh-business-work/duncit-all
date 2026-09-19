import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router';
import { InputAdornment, Stack } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useWebT } from '../../../shared/i18n';
import { paths } from '../../lib/paths';
import { makeSearchSchema, type SearchValues } from './search.types';

interface SearchFormProps {
  /** The current query, when the form sits on the results page. */
  initial?: string;
  /** Kept on the results link, so a city page's search stays in that city. */
  citySlug?: string | null;
}

/** The search box: submits to /search?q=. */
export function SearchForm({ initial = '', citySlug }: Readonly<SearchFormProps>) {
  const { t } = useWebT();
  const navigate = useNavigate();
  const schema = useMemo(() => makeSearchSchema(t), [t]);
  const { control, handleSubmit } = useForm<SearchValues>({ resolver: zodResolver(schema), defaultValues: { q: initial } });
  const submit = handleSubmit(({ q }) => {
    const base = paths.search(q);
    navigate(citySlug ? `${base}&city=${encodeURIComponent(citySlug)}` : base);
  });
  return (
    <Stack component="form" role="search" direction="row" spacing={1} onSubmit={submit} noValidate data-testid="search-form">
      <RhfTextField
        control={control}
        name="q"
        type="search"
        label={t('liteWeb.search.label')}
        placeholder={t('liteWeb.search.placeholder')}
        size="small"
        slotProps={{
          input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> },
          htmlInput: { 'data-testid': 'search-input' },
        }}
        hint=""
      />
      <DuncitButton type="submit" variant="contained" sx={{ flexShrink: 0, alignSelf: 'flex-start' }} data-testid="search-submit">
        {t('lite.common.search')}
      </DuncitButton>
    </Stack>
  );
}
