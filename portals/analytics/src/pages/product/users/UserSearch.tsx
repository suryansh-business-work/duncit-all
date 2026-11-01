import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Autocomplete, TextField } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { useDebouncedValue } from '@duncit/ui';
import { PRODUCT_USER_SEARCH } from '../queries';

interface Hit {
  user_id: string;
  name: string;
  contact?: string | null;
}

/** Finds a member by name, username, email, phone or id; their contact is shown masked. */
export default function UserSearch({ onPick }: Readonly<{ onPick: (userId: string) => void }>) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const search = useDebouncedValue(text.trim(), 300);
  const { data, loading } = useQuery(PRODUCT_USER_SEARCH, { variables: { search }, skip: search.length < 2 });
  const hits: Hit[] = search.length < 2 ? [] : (data?.productUserSearch ?? []);
  return (
    <Autocomplete<Hit>
      options={hits}
      loading={loading}
      filterOptions={(options) => options}
      getOptionLabel={(hit) => [hit.name || hit.user_id, hit.contact].filter(Boolean).join(' · ')}
      isOptionEqualToValue={(a, b) => a.user_id === b.user_id}
      onInputChange={(_event, value) => setText(value)}
      onChange={(_event, hit) => {
        if (hit) onPick(hit.user_id);
      }}
      noOptionsText={t(search.length < 2 ? 'analytics.product.users.typeToSearch' : 'analytics.product.users.noMatch')}
      loadingText={t('analytics.product.loading')}
      sx={{ maxWidth: 520 }}
      renderInput={(params) => (
        <TextField
          {...params}
          size="small"
          label={t('analytics.product.users.search')}
          slotProps={{
            ...params.slotProps,
            htmlInput: { ...params.slotProps.htmlInput, 'data-testid': 'product-user-search' },
          }}
        />
      )}
    />
  );
}
