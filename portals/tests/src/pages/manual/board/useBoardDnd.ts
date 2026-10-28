import { useCallback, useMemo, useState } from 'react';
import type { Active, DragEndEvent, DragOverEvent, DragStartEvent, Over } from '@dnd-kit/core';
import type { BoardColumnData, ManualCard } from '../shared/types';
import { cardsOf, itemsOf, moveAcross, planOf, settle, type Items, type MovePlan } from './dndItems';

/** Whether the dragged card's middle is below the middle of what it hovers. */
function isBelow(active: Active, over: Over): boolean {
  const dragged = active.rect.current.translated;
  if (!dragged) return false;
  return dragged.top + dragged.height / 2 > over.rect.top + over.rect.height / 2;
}

/**
 * The drag state of the board. While a card is in the air the board renders a
 * local copy of its columns (so the target column opens a gap); on drop the
 * move is handed to `onMove`, which writes the cache — and the local copy is
 * dropped in the same render, so nothing flickers back.
 */
export function useBoardDnd(columns: readonly BoardColumnData[], onMove: (plan: MovePlan, card: ManualCard) => void) {
  const baseItems = useMemo(() => itemsOf(columns), [columns]);
  const cards = useMemo(() => cardsOf(columns), [columns]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragItems, setDragItems] = useState<Items | null>(null);

  const onDragStart = useCallback(
    ({ active }: DragStartEvent) => {
      setActiveId(String(active.id));
      setDragItems(baseItems);
    },
    [baseItems]
  );

  const onDragOver = useCallback(({ active, over }: DragOverEvent) => {
    if (!over) return;
    setDragItems((current) =>
      current ? moveAcross(current, String(active.id), String(over.id), isBelow(active, over)) : current
    );
  }, []);

  const onDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      const id = String(active.id);
      const card = cards.get(id);
      const plan = over && dragItems && card ? planOf(settle(dragItems, id, String(over.id)), baseItems, id) : null;
      if (plan && card) onMove(plan, card);
      setActiveId(null);
      setDragItems(null);
    },
    [baseItems, cards, dragItems, onMove]
  );

  const onDragCancel = useCallback(() => {
    setActiveId(null);
    setDragItems(null);
  }, []);

  return {
    items: dragItems ?? baseItems,
    cards,
    activeCard: activeId ? cards.get(activeId) : undefined,
    handlers: { onDragStart, onDragOver, onDragEnd, onDragCancel },
  };
}
