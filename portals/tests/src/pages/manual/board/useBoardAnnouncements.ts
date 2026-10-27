import { useMemo } from 'react';
import type { Announcements, Over, ScreenReaderInstructions, UniqueIdentifier } from '@dnd-kit/core';
import { useTranslation } from '@duncit/shell';
import type { ManualCard } from '../shared/types';
import { containerOf, type Items } from './dndItems';

/**
 * What a screen reader hears while a card moves — in the reader's language,
 * naming the card by its key and the place by column and position.
 */
export function useBoardAnnouncements(
  cards: ReadonlyMap<string, ManualCard>,
  items: Items,
  columnNames: ReadonlyMap<string, string>
): { announcements: Announcements; screenReaderInstructions: ScreenReaderInstructions } {
  const { t } = useTranslation();
  return useMemo(() => {
    const keyOf = (id: UniqueIdentifier) => cards.get(String(id))?.key ?? '';
    const placeOf = (activeId: UniqueIdentifier, over: Over) => {
      const column = containerOf(items, String(over.id)) ?? '';
      const list = items[column] ?? [];
      const index = list.indexOf(String(activeId));
      const overIndex = list.indexOf(String(over.id));
      let position = list.length + 1;
      if (index !== -1) position = index + 1;
      else if (overIndex !== -1) position = overIndex + 1;
      return { key: keyOf(activeId), column: columnNames.get(column) ?? '', position };
    };
    return {
      screenReaderInstructions: { draggable: t('testsManual.board.dnd.instructions') },
      announcements: {
        onDragStart: ({ active }) => t('testsManual.board.dnd.picked', { vars: { key: keyOf(active.id) } }),
        onDragOver: ({ active, over }) =>
          over
            ? t('testsManual.board.dnd.over', { vars: placeOf(active.id, over) })
            : t('testsManual.board.dnd.outside', { vars: { key: keyOf(active.id) } }),
        onDragEnd: ({ active, over }) =>
          over
            ? t('testsManual.board.dnd.dropped', { vars: placeOf(active.id, over) })
            : t('testsManual.board.dnd.droppedOutside', { vars: { key: keyOf(active.id) } }),
        onDragCancel: ({ active }) => t('testsManual.board.dnd.cancelled', { vars: { key: keyOf(active.id) } }),
      },
    };
  }, [cards, columnNames, items, t]);
}
