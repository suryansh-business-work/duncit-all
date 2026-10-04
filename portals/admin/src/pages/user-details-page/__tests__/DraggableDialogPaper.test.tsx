/**
 * The dialog surface an admin can drag out of the way of the page behind it.
 *
 * Only the title bar (`data-dialog-drag-handle="true"`) picks it up — pressing
 * inside a text field must never start a drag — and it follows the pointer by
 * the distance moved, from wherever it was left last time, until released.
 */
import { createRef } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DraggableDialogPaper from '../DraggableDialogPaper';

const movePointer = (clientX: number, clientY: number) =>
  act(() => {
    globalThis.dispatchEvent(new MouseEvent('pointermove', { clientX, clientY }));
  });

const releasePointer = () =>
  act(() => {
    globalThis.dispatchEvent(new MouseEvent('pointerup'));
  });

const renderPaper = () => {
  const ref = createRef<HTMLDivElement>();
  render(
    <DraggableDialogPaper ref={ref} data-testid="paper" style={{ opacity: 0.5 }}>
      <div data-dialog-drag-handle="true">
        <span>Call User</span>
      </div>
      <input aria-label="Notes" />
    </DraggableDialogPaper>,
  );
  return { paper: screen.getByTestId('paper'), ref };
};

describe('DraggableDialogPaper', () => {
  it('starts where MUI put it, keeping the style it was given and forwarding its ref', () => {
    const { paper, ref } = renderPaper();

    expect(paper.style.transform).toBe('translate(0px, 0px)');
    expect(paper.style.opacity).toBe('0.5');
    expect(ref.current).toBe(paper);
  });

  it('follows the pointer by the distance moved while held by the title', () => {
    const { paper } = renderPaper();

    fireEvent.pointerDown(screen.getByText('Call User'), { clientX: 100, clientY: 100 });
    movePointer(130, 150);

    expect(paper.style.transform).toBe('translate(30px, 50px)');
  });

  it('stops following once released, and resumes from where it was left', () => {
    const { paper } = renderPaper();

    fireEvent.pointerDown(screen.getByText('Call User'), { clientX: 100, clientY: 100 });
    movePointer(130, 150);
    releasePointer();
    movePointer(400, 400);

    expect(paper.style.transform).toBe('translate(30px, 50px)');

    fireEvent.pointerDown(screen.getByText('Call User'), { clientX: 10, clientY: 10 });
    movePointer(0, 20);

    expect(paper.style.transform).toBe('translate(20px, 60px)');
  });

  it('ignores a press anywhere but the title, so typing in a field never drags', () => {
    const { paper } = renderPaper();

    fireEvent.pointerDown(screen.getByRole('textbox', { name: 'Notes' }), {
      clientX: 100,
      clientY: 100,
    });
    movePointer(300, 300);

    expect(paper.style.transform).toBe('translate(0px, 0px)');
  });
});
