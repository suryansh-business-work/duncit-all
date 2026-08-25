import { useMemo, useState } from 'react';
import {
  Box,
  Chip,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

export interface SidebarItem {
  /** Stable id — the value handed back to `onSelect`. */
  key: string;
  primary: string;
  /** Shown under the title in monospace: a slug, a category. */
  secondary?: string;
  /** Renders an "off" chip. */
  off?: boolean;
  /**
   * A number the row carries — the Templates list puts its send count here.
   *
   * Not a link, deliberately: the row is already a button, and an anchor
   * inside one is neither valid nor reachable by keyboard. The clickable
   * version of the same number lives in the editor beside it.
   */
  badge?: { label: string; title: string; muted?: boolean };
}

/**
 * One row, hoisted out of the list's `.map` so the list itself stays a list.
 *
 * The number down the left is the row's position in what is CURRENTLY visible,
 * not in the unfiltered set — a filtered list renumbers from 1.
 */
function SidebarRow({
  item,
  position,
  selected,
  onSelect,
}: Readonly<{
  item: SidebarItem;
  position: number;
  selected: boolean;
  onSelect: (key: string) => void;
}>) {
  return (
    <ListItemButton
      selected={selected}
      onClick={() => onSelect(item.key)}
      sx={{ alignItems: 'flex-start', gap: 1 }}
    >
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          minWidth: 22,
          textAlign: 'right',
          pt: 0.35,
          fontVariantNumeric: 'tabular-nums'
        }}>
        {position}
      </Typography>
      <ListItemText
        primary={item.primary}
        secondary={
          item.secondary ? (
            <Box component="span" sx={{ fontFamily: 'monospace', fontSize: 11 }}>
              {item.secondary}
            </Box>
          ) : undefined
        }
        sx={{ my: 0 }}
      />
      {item.badge && (
        <Tooltip title={item.badge.title}>
          <Chip
            size="small"
            variant="outlined"
            color={item.badge.muted ? 'default' : 'primary'}
            label={item.badge.label}
            sx={{ mt: 0.25, fontVariantNumeric: 'tabular-nums' }}
          />
        </Tooltip>
      )}
      {item.off && <Chip size="small" label="off" sx={{ mt: 0.25 }} />}
    </ListItemButton>
  );
}

interface Props {
  items: SidebarItem[];
  selected: string | null;
  onSelect: (key: string) => void;
  searchPlaceholder: string;
  emptyText: string;
  width?: number;
}

/**
 * The picker down the left of both email pages.
 *
 * One component rather than two near-identical lists: Templates and Fragments
 * differ only in what they call a row. Both had the same problem — thirty-five
 * entries with no search and no height of their own, so finding one meant
 * scrolling the whole window and losing the editor off the top of the screen.
 *
 * The search box stays put while the rows scroll, and the count says how much
 * of the list you are looking at, so a filter that hides everything is
 * obviously a filter rather than an empty list.
 */
export default function EmailSidebarList({
  items,
  selected,
  onSelect,
  searchPlaceholder,
  emptyText,
  width = 280,
}: Readonly<Props>) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(
      (item) =>
        item.primary.toLowerCase().includes(needle) ||
        (item.secondary ?? '').toLowerCase().includes(needle)
    );
  }, [items, search]);

  return (
    <Box
      sx={{
        width,
        flexShrink: 0,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
        <TextField
          size="small"
          fullWidth
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchPlaceholder}
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
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            pl: 0.5
          }}>
          {filtered.length === items.length
            ? `${items.length} total`
            : `${filtered.length} of ${items.length}`}
        </Typography>
      </Box>

      <List dense disablePadding sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {filtered.length === 0 && (
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              p: 2
            }}>
            {search.trim() ? `Nothing matches “${search.trim()}”.` : emptyText}
          </Typography>
        )}
        {filtered.map((item, index) => (
          <SidebarRow
            key={item.key}
            item={item}
            position={index + 1}
            selected={selected === item.key}
            onSelect={onSelect}
          />
        ))}
      </List>
    </Box>
  );
}
