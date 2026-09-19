import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { InputAdornment, LinearProgress, List, ListItem, Stack, TextField, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { useDebouncedValue } from '@duncit/ui';
import ProductCardRow from '../ProductCardRow';
import { PICKER_SEARCH, type PickerSearchRow } from '../../queries/products';

/** Characters typed before the catalogue is searched. */
const MIN_SEARCH = 2;
const RESULTS = 8;

interface ProductSearchProps {
  chosen: ReadonlySet<string>;
  /** The list holds as many as it may — nothing more can be added. */
  full: boolean;
  onAdd: (row: PickerSearchRow) => void;
}

/** Find store products by name, SKU or brand and add them to a hand-picked list. */
export default function ProductSearch({ chosen, full, onAdd }: Readonly<ProductSearchProps>) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const term = useDebouncedValue(search.trim(), 350);
  const ready = term.length >= MIN_SEARCH;
  const { data, loading } = useQuery(PICKER_SEARCH, {
    variables: { query: { search: term, page: 1, page_size: RESULTS } },
    skip: !ready,
  });
  const rows = ready ? (data?.storeAdminProductsTable.rows ?? []) : [];
  return (
    <Stack spacing={1}>
      <TextField
        label={t('ecommPortal.picker.search')}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        helperText={t('ecommPortal.picker.searchHint')}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />
      {loading && <LinearProgress aria-label={t('shell.a11y.loading')} />}
      {ready && !loading && rows.length === 0 && (
        <Typography role="status" variant="body2" sx={{ color: 'text.secondary' }}>
          {t('ecommPortal.picker.noMatches')}
        </Typography>
      )}
      {rows.length > 0 && (
        <List dense disablePadding aria-label={t('ecommPortal.picker.results')}>
          {rows.map((row) => {
            const name = row.title || row.product_name;
            const added = chosen.has(row.id);
            return (
              <ListItem key={row.id} disableGutters divider sx={{ display: 'block' }}>
                <ProductCardRow title={name} imageUrl={row.image_url} caption={row.brand_name || row.sku} price={row.price}>
                  <DuncitButton
                    size="small"
                    startIcon={<AddIcon />}
                    disabled={added || full}
                    onClick={() => onAdd(row)}
                    aria-label={t('ecommPortal.picker.addNamed', { vars: { name } })}
                  >
                    {added ? t('ecommPortal.picker.added') : t('ecommPortal.picker.add')}
                  </DuncitButton>
                </ProductCardRow>
              </ListItem>
            );
          })}
        </List>
      )}
    </Stack>
  );
}
