import { forwardRef, useEffect, useRef, useState } from 'react';
import { Paper, type PaperProps } from '@mui/material';

export default forwardRef<HTMLDivElement, PaperProps>(function DraggableDialogPaper(props, ref) {
  const startRef = useRef({ pointerX: 0, pointerY: 0, x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!dragging) return;
    const onMove = (event: PointerEvent) => {
      setPosition({
        x: startRef.current.x + event.clientX - startRef.current.pointerX,
        y: startRef.current.y + event.clientY - startRef.current.pointerY,
      });
    };
    const onUp = () => setDragging(false);
    globalThis.addEventListener('pointermove', onMove);
    globalThis.addEventListener('pointerup', onUp);
    return () => {
      globalThis.removeEventListener('pointermove', onMove);
      globalThis.removeEventListener('pointerup', onUp);
    };
  }, [dragging]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (!target.closest('[data-dialog-drag-handle="true"]')) return;
    startRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      x: position.x,
      y: position.y,
    };
    setDragging(true);
  };

  return (
    <Paper
      ref={ref}
      {...props}
      onPointerDown={onPointerDown}
      style={{
        ...props.style,
        transform: `translate(${position.x}px, ${position.y}px)`,
      }}
    />
  );
});