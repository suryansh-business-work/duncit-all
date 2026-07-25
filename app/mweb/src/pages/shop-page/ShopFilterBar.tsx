import { useState } from 'react';
import { Badge, Box, Collapse, IconButton, InputAdornment, MenuItem, Stack, TextField } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded';
import ClubCategoryChips from '../clubs-page/ClubCategoryChips';
import type { SearchCategory } from '../search-page/useSearchDiscovery';
import { SHOP_SORT_OPTIONS, type ShopSort } from './queries';

interface Props {
  q: string;
  onQueryChange: (value: string) => void;
  sort: ShopSort;
  onSortChange: (sort: ShopSort) => void;
  categoryId: string;
  onCategoryChange: (id: string) => void;
  categoryOptions: SearchCategory[];
}

/** Search field + a filter button that reveals the category rail and sort — the
 * filters live behind the button (with an active-count badge) to keep the Pod
 * Shop header clean. Twin of the native shop filter bar. */
export default function ShopFilterBar({
  q,
  onQueryChange,
  sort,
  onSortChange,
  categoryId,
  onCategoryChange,
  categoryOptions,
}: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  const activeCount = (categoryId ? 1 : 0) + (sort === 'NAME' ? 0 : 1);
  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center">
        <TextField
          size="small"
          placeholder="Search products or brands…"
          value={q}
          onChange={(e) => onQueryChange(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{
            flex: 1,
            '& .MuiOutlinedInput-root': { borderRadius: 999, bgcolor: 'background.paper' },
          }}
        />
        <IconButton
          aria-label="Filters"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          sx={{
            bgcolor: open ? 'primary.main' : 'action.hover',
            color: open ? 'primary.contrastText' : 'inherit',
            '&:hover': { bgcolor: open ? 'primary.dark' : 'action.selected' },
          }}
        >
          <Badge badgeContent={activeCount} color="error">
            <FilterListRoundedIcon />
          </Badge>
        </IconButton>
      </Stack>
      <Collapse in={open}>
        <Stack spacing={1.5} sx={{ pt: 1.5 }}>
          <ClubCategoryChips
            categories={categoryOptions}
            selectedId={categoryId}
            onSelect={onCategoryChange}
          />
          <TextField
            select
            size="small"
            label="Sort"
            value={sort}
            onChange={(e) => onSortChange(e.target.value as ShopSort)}
            sx={{ maxWidth: 220 }}
          >
            {SHOP_SORT_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Collapse>
    </Box>
  );
}
