import type { KeyboardEvent } from 'react';

/**
 * A keydown handler that does what a click does on Enter or Space (WCAG 2.1.1).
 *
 * For the picker's surfaces that are clickable but are not buttons — the drop
 * zone, and the Pexels cards that must stay list items of their grid.
 */
export function activateOnKey(action: () => void) {
  return (event: KeyboardEvent) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    action();
  };
}
