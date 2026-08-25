import { useMemo, useState } from 'react';
import { Box, List, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import SidebarRow from './SidebarRow';
import SidebarToolbar, { type SidebarFilter } from './SidebarToolbar';
import {
  applySidebarView,
  countLabel,
  emptyMessage,
  sortOptionsFor,
  type SidebarItem,
  type SidebarSort,
  type SidebarStatus,
} from './sidebar-view';

export { countBadge } from './sidebar-view';
export type { SidebarItem, SidebarOption } from './sidebar-view';
export type { SidebarFilter } from './SidebarToolbar';

interface Props {
  items: SidebarItem[];
  selected: string | null;
  onSelect: (key: string) => void;
  searchPlaceholder: string;
  emptyText: string;
  /** An extra select the page owns — Templates narrows by header/footer. */
  filter?: SidebarFilter;
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
 * The toolbar stays put while the rows scroll, and the count says how much of
 * the list you are looking at, so a filter that hides everything is obviously a
 * filter rather than an empty list.
 */
export default function EmailSidebarList({
  items,
  selected,
  onSelect,
  searchPlaceholder,
  emptyText,
  filter,
  width = 300,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SidebarSort>('list');
  const [status, setStatus] = useState<SidebarStatus>('all');

  const sortOptions = useMemo(() => sortOptionsFor(t, items), [t, items]);
  const group = filter?.value ?? '';
  const visible = useMemo(
    () => applySidebarView({ items, search, sort, status, group }),
    [items, search, sort, status, group]
  );

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
        <SidebarToolbar
          search={search}
          onSearch={setSearch}
          searchPlaceholder={searchPlaceholder}
          sort={sort}
          onSort={setSort}
          sortOptions={sortOptions}
          status={status}
          onStatus={setStatus}
          filter={filter}
        />
        <Typography variant="caption" sx={{ color: 'text.secondary', pl: 0.5 }}>
          {countLabel(t, visible.length, items.length)}
        </Typography>
      </Box>

      <List dense disablePadding sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {visible.length === 0 && (
          <Typography variant="body2" sx={{ color: 'text.secondary', p: 2 }}>
            {emptyMessage(t, {
              search,
              filtered: status !== 'all' || group !== '',
              emptyText,
            })}
          </Typography>
        )}
        {visible.map((item, index) => (
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
