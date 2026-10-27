import { useMemo } from 'react';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Stack } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { ManualColumn } from '../shared/types';
import { ColumnRow } from './ColumnRow';

interface Props {
  columns: readonly ManualColumn[];
  onMove: (activeId: string, overId: string) => void;
  onEdit: (column: ManualColumn) => void;
  onDelete: (column: ManualColumn) => void;
}

/** The board's columns top to bottom = left to right; drag a handle (or Space + arrows) to reorder. */
export default function ColumnsList({ columns, onMove, onEdit, onDelete }: Readonly<Props>) {
  const { t } = useTranslation();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const ids = useMemo(() => columns.map((column) => column.id), [columns]);

  const accessibility = useMemo(() => {
    const nameOf = (id: UniqueIdentifier) => columns.find((column) => column.id === String(id))?.name ?? '';
    const positionOf = (id: UniqueIdentifier) => ids.indexOf(String(id)) + 1;
    const announcements: Announcements = {
      onDragStart: ({ active }) => t('testsManual.settings.dnd.picked', { vars: { name: nameOf(active.id) } }),
      onDragOver: ({ active, over }) =>
        over
          ? t('testsManual.settings.dnd.over', { vars: { name: nameOf(active.id), position: positionOf(over.id) } })
          : undefined,
      onDragEnd: ({ active, over }) =>
        over
          ? t('testsManual.settings.dnd.dropped', { vars: { name: nameOf(active.id), position: positionOf(over.id) } })
          : t('testsManual.settings.dnd.cancelled', { vars: { name: nameOf(active.id) } }),
      onDragCancel: ({ active }) => t('testsManual.settings.dnd.cancelled', { vars: { name: nameOf(active.id) } }),
    };
    return { announcements, screenReaderInstructions: { draggable: t('testsManual.settings.dnd.instructions') } };
  }, [columns, ids, t]);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) onMove(String(active.id), String(over.id));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} accessibility={accessibility} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <Stack component="ol" spacing={1} sx={{ listStyle: 'none', p: 0, m: 0 }} aria-label={t('testsManual.settings.listLabel')}>
          {columns.map((column) => (
            <ColumnRow
              key={column.id}
              column={column}
              deletable={columns.length > 1}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </Stack>
      </SortableContext>
    </DndContext>
  );
}
