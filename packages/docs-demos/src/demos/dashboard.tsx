import {
  BREAKPOINTS,
  CELL_HEIGHT,
  GRID_COLUMNS,
  defaultLayout,
  layoutsEqual,
  normalisePosition,
  resolveLayout,
} from '@duncit/dashboard';
import { defineDemo, defineDemos } from '../types';

interface LayoutMock {
  /** What the page declares — id and where the widget sits out of the box. */
  widgets: { id: string; defaultLayout: { x: number; y: number; w: number; h: number } }[];
  /** What this user dragged it to last time, loaded from the server. */
  saved: { id: string; x: number; y: number; w: number; h: number }[];
}

export default defineDemos('dashboard', [
  defineDemo<LayoutMock>({
    id: 'resolve',
    title: 'The saved layout, reconciled with the widgets that exist today',
    note:
      'Add a widget the saved layout has never seen — it lands under everything rather than on top of something. Delete one from widgets and its saved row is dropped instead of leaving a hole.',
    mock: {
      widgets: [
        { id: 'pods-today', defaultLayout: { x: 0, y: 0, w: 6, h: 3 } },
        { id: 'revenue', defaultLayout: { x: 6, y: 0, w: 6, h: 3 } },
        { id: 'signups', defaultLayout: { x: 0, y: 3, w: 4, h: 2 } },
        { id: 'open-tickets', defaultLayout: { x: 4, y: 3, w: 8, h: 2 } },
      ],
      saved: [
        { id: 'revenue', x: 0, y: 0, w: 8, h: 4 },
        { id: 'pods-today', x: 8, y: 0, w: 4, h: 4 },
        { id: 'a-widget-that-was-removed', x: 0, y: 4, w: 12, h: 2 },
      ],
    },
    compute: (mock) => {
      const widgets = mock.widgets.map((widget) => ({ ...widget, content: null }));
      const resolved = resolveLayout(widgets, mock.saved);
      return {
        'Grid': `${GRID_COLUMNS} columns, ${CELL_HEIGHT}px a row`,
        'Collapses at': BREAKPOINTS.map((point) => `< ${point.w}px → ${point.c} column(s)`),
        'Layout actually rendered': resolved,
        'Widgets with no saved row': resolved
          .filter((item) => !mock.saved.some((row) => row.id === item.id))
          .map((item) => item.id),
        'Already at defaults': layoutsEqual(resolved, defaultLayout(widgets)),
        'A position out of bounds is clamped': normalisePosition({ x: 11, y: -4, w: 20, h: 0 }),
      };
    },
  }),
]);
