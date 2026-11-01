import { useMemo, useState } from 'react';
import type { Dimensions, Node, NodeChange, XYPosition } from '@xyflow/react';
import { SEAT_HEIGHT, SEAT_WIDTH, canReparent } from './layout';
import type { SeatData } from './SeatCard';
import type { TeamNode } from './types';

type Seat = Node<SeatData>;

interface Drag {
  id: string;
  position: XYPosition;
  /** The seat the dragged one would move under if it were released now. */
  overId: string | null;
}

/** The seat whose card holds the dragged card's centre, when the dragged seat may move under it. */
function seatUnder(seats: readonly Seat[], sizes: ReadonlyMap<string, Dimensions>, dragged: Seat, tree: readonly TeamNode[]): string | null {
  const size = (id: string) => sizes.get(id) ?? { width: SEAT_WIDTH, height: SEAT_HEIGHT };
  const own = size(dragged.id);
  const x = dragged.position.x + own.width / 2;
  const y = dragged.position.y + own.height / 2;
  const hit = seats.find((seat) => {
    const { width, height } = size(seat.id);
    return seat.id !== dragged.id && x >= seat.position.x && x <= seat.position.x + width && y >= seat.position.y && y <= seat.position.y + height;
  });
  return hit && canReparent(tree, dragged.id, hit.id) ? hit.id : null;
}

/**
 * Dragging a seat: it follows the pointer, the seat it would land under lights
 * up, and on release it moves under that seat or springs back to its slot.
 *
 * Also keeps each card's measured size. React Flow forgets the size of any node
 * it is handed without one, so every re-render used to hide all cards and edges
 * until they were measured again.
 */
export function useSeatDrag(laidOut: Seat[], tree: readonly TeamNode[], onReparent?: (childId: string, parentId: string) => void) {
  const [sizes, setSizes] = useState<ReadonlyMap<string, Dimensions>>(new Map());
  const [drag, setDrag] = useState<Drag | null>(null);

  const sized = useMemo(
    () =>
      laidOut.map((seat) => {
        const measured = sizes.get(seat.id);
        return measured ? { ...seat, measured } : seat;
      }),
    [laidOut, sizes],
  );

  // Only the dragged seat and the one under it change, so React Flow re-renders just those two.
  const nodes = useMemo(() => {
    if (!drag) return sized;
    return sized.map((seat) => {
      if (seat.id === drag.id) return { ...seat, position: drag.position };
      return seat.id === drag.overId ? { ...seat, data: { ...seat.data, dropTarget: true } } : seat;
    });
  }, [sized, drag]);

  const onNodesChange = (changes: NodeChange<Seat>[]) => {
    const measured = changes.flatMap((change) =>
      change.type === 'dimensions' && change.dimensions ? [[change.id, change.dimensions] as const] : [],
    );
    if (measured.length > 0) setSizes((prev) => new Map([...prev, ...measured]));
  };

  const onNodeDrag = (_event: unknown, seat: Seat) =>
    setDrag({ id: seat.id, position: seat.position, overId: seatUnder(laidOut, sizes, seat, tree) });

  const onNodeDragStop = (_event: unknown, seat: Seat) => {
    const overId = seatUnder(laidOut, sizes, seat, tree);
    setDrag(null);
    if (overId) onReparent?.(seat.id, overId);
  };

  return { nodes, onNodesChange, onNodeDrag, onNodeDragStop };
}
