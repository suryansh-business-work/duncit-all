import type { HTMLAttributes, Key } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import CategoryIcon from '@mui/icons-material/CategoryOutlined';
import SearchIcon from '@mui/icons-material/Search';
import StorefrontIcon from '@mui/icons-material/StorefrontOutlined';

import { StoreImage } from '../../StoreImage';
import type { SuggestOption } from './search.types';

type RowProps = HTMLAttributes<HTMLLIElement> & { key: Key };

function RowIcon({ option }: Readonly<{ option: SuggestOption }>) {
  if (option.kind === 'product') {
    return (
      <Box sx={{ width: 40, flexShrink: 0 }}>
        <StoreImage src={option.image} alt="" width={40} height={40} sx={{ borderRadius: 1 }} />
      </Box>
    );
  }
  if (option.kind === 'category') return <CategoryIcon color="action" aria-hidden />;
  if (option.kind === 'brand') return <StorefrontIcon color="action" aria-hidden />;
  return <SearchIcon color="action" aria-hidden />;
}

/** One type-ahead row, as the Autocomplete listbox renders it. */
export function renderSuggestRow(props: RowProps, option: SuggestOption) {
  const { key, ...rest } = props;
  return (
    <Box component="li" key={key} {...rest}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minHeight: 44, width: '100%' }}>
        <RowIcon option={option} />
        <Typography variant="body2" noWrap>
          {option.label}
        </Typography>
      </Stack>
    </Box>
  );
}
