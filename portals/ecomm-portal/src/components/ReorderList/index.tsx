import type { ReactNode } from 'react';
import { Card, List, Typography } from '@mui/material';
import { moveId, type MoveDirection } from '../../lib/reorder';
import ReorderRow from './ReorderRow';

export interface ReorderListProps<T> {
  items: readonly T[];
  ariaLabel: string;
  emptyText: string;
  busy: boolean;
  getId: (item: T) => string;
  getName: (item: T) => string;
  renderSecondary?: (item: T) => ReactNode;
  renderLeading?: (item: T) => ReactNode;
  getDepth?: (item: T) => number;
  /** The ids a row reorders among, in order. Defaults to every row — a category passes its siblings. */
  siblingsOf?: (item: T) => string[];
  onReorder: (ids: string[]) => void;
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
}

/**
 * A list the operator orders by hand — the store shows its pet types, filters,
 * collections and home sections in exactly this order. Each move sends the new
 * order of the row's own group.
 */
export default function ReorderList<T>({
  items,
  ariaLabel,
  emptyText,
  busy,
  getId,
  getName,
  renderSecondary,
  renderLeading,
  getDepth,
  siblingsOf,
  onReorder,
  onEdit,
  onDelete,
}: Readonly<ReorderListProps<T>>) {
  if (items.length === 0) {
    return (
      <Card variant="outlined" sx={{ p: 3 }}>
        <Typography role="status" sx={{ color: 'text.secondary' }}>
          {emptyText}
        </Typography>
      </Card>
    );
  }
  const allIds = items.map(getId);
  return (
    <Card variant="outlined">
      <List aria-label={ariaLabel} disablePadding>
        {items.map((item) => {
          const id = getId(item);
          const group = siblingsOf ? siblingsOf(item) : allIds;
          const move = (direction: MoveDirection) => {
            const next = moveId(group, id, direction);
            if (next) onReorder(next);
          };
          return (
            <ReorderRow
              key={id}
              name={getName(item)}
              secondary={renderSecondary?.(item)}
              leading={renderLeading?.(item)}
              depth={getDepth?.(item) ?? 0}
              canMoveUp={group.indexOf(id) > 0}
              canMoveDown={group.indexOf(id) < group.length - 1}
              busy={busy}
              onMove={move}
              onEdit={() => onEdit(item)}
              onDelete={() => onDelete(item)}
            />
          );
        })}
      </List>
    </Card>
  );
}
