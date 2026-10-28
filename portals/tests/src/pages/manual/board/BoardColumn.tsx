import { memo, useId } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Box, Paper, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { BoardColumnData, ManualCard } from '../shared/types';
import { ColumnHeader } from './ColumnHeader';
import { columnDropId } from './dndItems';
import QuickCreate from './quick-create';
import { SortableCard } from './SortableCard';

interface Props {
  data: BoardColumnData;
  /** The card ids this column shows right now — during a drag, its local copy. */
  ids: readonly string[];
  cards: ReadonlyMap<string, ManualCard>;
  filtered: boolean;
  loadingMore: boolean;
  onLoadMore: (columnId: string) => void;
  onOpen: (key: string) => void;
  onCreated: () => void;
}

/** One column: its header, its cards (a drop target even when empty), load more, and quick create. */
export const BoardColumn = memo(function BoardColumn({
  data,
  ids,
  cards,
  filtered,
  loadingMore,
  onLoadMore,
  onOpen,
  onCreated,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const headingId = useId();
  const { column } = data;
  const { setNodeRef, isOver } = useDroppable({ id: columnDropId(column.id) });
  const remaining = data.total - data.cases.length;

  return (
    <Paper
      component="section"
      variant="outlined"
      aria-labelledby={headingId}
      sx={(theme) => ({
        flex: '0 0 auto',
        width: { xs: '85vw', sm: theme.spacing(36) },
        maxHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: isOver ? 'action.hover' : 'background.default',
        scrollSnapAlign: 'start',
      })}
    >
      <ColumnHeader column={column} shown={data.total} filtered={filtered} headingId={headingId} />
      <SortableContext id={column.id} items={[...ids]} strategy={verticalListSortingStrategy}>
        <Stack
          ref={setNodeRef}
          component="ul"
          spacing={1}
          aria-labelledby={headingId}
          sx={(theme) => ({ listStyle: 'none', m: 0, px: 1, py: 0.5, minHeight: theme.spacing(10), overflowY: 'auto', flex: 1 })}
        >
          {ids.map((id) => {
            const card = cards.get(id);
            return card ? <SortableCard key={id} card={card} onOpen={onOpen} /> : null;
          })}
        </Stack>
      </SortableContext>
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        {remaining > 0 ? (
          <DuncitButton size="small" onClick={() => onLoadMore(column.id)} loading={loadingMore} sx={{ mx: 1 }}>
            {t('testsManual.board.loadMore', { vars: { count: remaining } })}
          </DuncitButton>
        ) : null}
        <QuickCreate columnId={column.id} columnName={column.name} onCreated={onCreated} />
      </Box>
    </Paper>
  );
});
