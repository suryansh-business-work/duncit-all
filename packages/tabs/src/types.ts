import type { ReactNode } from 'react';
import type { TabProps } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';

/** What a tab's selection can be. Anything the query string can round-trip. */
export type TabValue = string | number;

export interface DuncitTabItem<T extends TabValue> {
  /**
   * What the URL carries for this tab.
   *
   * Prefer a slug over a position: `?selectedtab=2` means nothing to a reader
   * and points at a different tab the moment one is inserted. An index is only
   * right when the tabs have no identity of their own (a variant list).
   */
  value: T;
  label: ReactNode;
  /**
   * React key, when `value` is not a stable one — an index-valued tab needs
   * this, because an array index as a key is its own bug (Sonar S6479).
   */
  key?: string | number;
  icon?: TabProps['icon'];
  iconPosition?: TabProps['iconPosition'];
  disabled?: boolean;
  sx?: SxProps<Theme>;
  /** Rendered as `data-testid` on the tab. */
  testId?: string;
}

/**
 * The controlled contract of a tab strip: what to draw, what is picked, and
 * how to pick.
 *
 * `useTabParam` returns exactly this shape, so a strip that owns its own
 * selection spreads the hook straight into `<DuncitTabs {...tabs} />`, while a
 * presentational strip whose parent owns the selection passes the same three
 * props down by hand. One component, both cases, no second API.
 */
export interface DuncitTabsState<T extends TabValue> {
  items: readonly DuncitTabItem<T>[];
  value: T;
  /** Selects a tab — from a click, or programmatically. */
  onChange: (next: T) => void;
}
