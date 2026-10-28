import { useMemo } from 'react';
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type KeyboardCodes,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Box, Card } from '@mui/material';
import type { BoardColumnData, ManualCard } from '../shared/types';
import { BoardColumn } from './BoardColumn';
import { CaseCardFace } from './CaseCardFace';
import type { MovePlan } from './dndItems';
import { useBoardAnnouncements } from './useBoardAnnouncements';
import { useBoardDnd } from './useBoardDnd';

/** Space picks a card up and puts it down; Enter stays free to open the case. */
const KEYBOARD_CODES: KeyboardCodes = { start: ['Space'], cancel: ['Escape'], end: ['Space'] };

interface Props {
  columns: readonly BoardColumnData[];
  filtered: boolean;
  loadingMore: string | null;
  onMove: (plan: MovePlan, card: ManualCard) => void;
  onLoadMore: (columnId: string) => void;
  onOpen: (key: string) => void;
  onCreated: () => void;
}

/** The drag-and-drop board: columns side by side, scrolling sideways on a narrow screen. */
export default function KanbanBoard({
  columns,
  filtered,
  loadingMore,
  onMove,
  onLoadMore,
  onOpen,
  onCreated,
}: Readonly<Props>) {
  const dnd = useBoardDnd(columns, onMove);
  const sensors = useSensors(
    // A few pixels of travel before a drag starts, so a click still opens the case.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates, keyboardCodes: KEYBOARD_CODES })
  );
  const columnNames = useMemo(() => new Map(columns.map((data) => [data.column.id, data.column.name])), [columns]);
  const accessibility = useBoardAnnouncements(dnd.cards, dnd.items, columnNames);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} accessibility={accessibility} {...dnd.handlers}>
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          alignItems: 'stretch',
          overflowX: 'auto',
          pb: 2,
          scrollSnapType: { xs: 'x mandatory', sm: 'none' },
          height: (theme) => `calc(100vh - ${theme.spacing(32)})`,
          minHeight: (theme) => theme.spacing(60),
        }}
      >
        {columns.map((data) => (
          <BoardColumn
            key={data.column.id}
            data={data}
            ids={dnd.items[data.column.id] ?? []}
            cards={dnd.cards}
            filtered={filtered}
            loadingMore={loadingMore === data.column.id}
            onLoadMore={onLoadMore}
            onOpen={onOpen}
            onCreated={onCreated}
          />
        ))}
      </Box>
      <DragOverlay>
        {dnd.activeCard ? (
          <Card variant="outlined" sx={{ boxShadow: 8, cursor: 'grabbing' }}>
            <CaseCardFace card={dnd.activeCard} />
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
