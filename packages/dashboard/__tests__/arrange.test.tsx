/**
 * The Arrange menu — moving and resizing a widget without dragging it (WCAG
 * 2.5.7 Dragging Movements, 2.1.1 Keyboard). The maths is pure, so it is
 * asserted directly; the menu is exercised through the card that renders it.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DashboardWidgetCard } from '../src/DashboardWidgetCard';
import {
  ARRANGE_ACTIONS,
  arrangeLayout,
  availableArrangeActions,
  minSizeOf,
  type ArrangeAction,
} from '../src/layout';
import type { DashboardArrange, DashboardLayoutItem, DashboardWidget } from '../src/types';

const item = (id: string, x: number, y: number, w: number, h: number): DashboardLayoutItem => ({ id, x, y, w, h });

const widget = (id: string, over: Partial<DashboardWidget> = {}): DashboardWidget => ({
  id,
  title: id,
  content: <div data-testid={`body-${id}`}>body {id}</div>,
  defaultLayout: { x: 0, y: 0, w: 6, h: 3 },
  ...over,
});

// Two half-width widgets side by side, a full-width one under them.
const LAYOUT = [item('pods', 0, 0, 6, 3), item('revenue', 6, 0, 6, 3), item('tickets', 0, 3, 12, 2)];
const MIN = { w: 3, h: 2 };

describe('arrangeLayout', () => {
  it('trades slots with the previous widget in reading order', () => {
    expect(arrangeLayout(LAYOUT, 'revenue', 'earlier', MIN)).toEqual([
      item('pods', 6, 0, 6, 3),
      item('revenue', 0, 0, 6, 3),
      item('tickets', 0, 3, 12, 2),
    ]);
  });

  it('trades slots with the next widget, keeping each size inside the grid', () => {
    expect(arrangeLayout(LAYOUT, 'revenue', 'later', MIN)).toEqual([
      item('pods', 0, 0, 6, 3),
      item('revenue', 0, 3, 6, 3),
      item('tickets', 0, 0, 12, 2),
    ]);
  });

  it('leaves the layout alone at either end of the reading order, or for an unknown widget', () => {
    expect(arrangeLayout(LAYOUT, 'pods', 'earlier', MIN)).toEqual(LAYOUT);
    expect(arrangeLayout(LAYOUT, 'tickets', 'later', MIN)).toEqual(LAYOUT);
    expect(arrangeLayout(LAYOUT, 'retired', 'later', MIN)).toEqual(LAYOUT);
  });

  it('grows one column, sliding left rather than past column 12', () => {
    expect(arrangeLayout(LAYOUT, 'pods', 'wider', MIN)[0]).toEqual(item('pods', 0, 0, 7, 3));
    expect(arrangeLayout(LAYOUT, 'revenue', 'wider', MIN)[1]).toEqual(item('revenue', 5, 0, 7, 3));
    expect(arrangeLayout(LAYOUT, 'tickets', 'wider', MIN)[2]).toEqual(item('tickets', 0, 3, 12, 2));
  });

  it('shrinks one cell, never below the minimum', () => {
    expect(arrangeLayout(LAYOUT, 'pods', 'narrower', MIN)[0]).toEqual(item('pods', 0, 0, 5, 3));
    expect(arrangeLayout(LAYOUT, 'pods', 'shorter', MIN)[0]).toEqual(item('pods', 0, 0, 6, 2));
    expect(arrangeLayout(LAYOUT, 'tickets', 'shorter', MIN)[2]).toEqual(item('tickets', 0, 3, 12, 2));
    expect(arrangeLayout([item('kpi', 0, 0, 3, 2)], 'kpi', 'narrower', MIN)).toEqual([item('kpi', 0, 0, 3, 2)]);
  });

  it('grows one row', () => {
    expect(arrangeLayout(LAYOUT, 'tickets', 'taller', MIN)[2]).toEqual(item('tickets', 0, 3, 12, 3));
  });
});

describe('minSizeOf', () => {
  it('takes the widget minimum when it declares one', () => {
    expect(minSizeOf(widget('pods', { minW: 4, minH: 5 }))).toEqual({ w: 4, h: 5 });
  });

  it('otherwise caps the declared size at 3×2', () => {
    expect(minSizeOf(widget('pods'))).toEqual({ w: 3, h: 2 });
    expect(minSizeOf(widget('dot', { defaultLayout: { x: 0, y: 0, w: 2, h: 1 } }))).toEqual({ w: 2, h: 1 });
  });
});

describe('availableArrangeActions', () => {
  it('offers only the moves that change something', () => {
    expect(availableArrangeActions(LAYOUT, widget('pods'))).toEqual(['later', 'wider', 'narrower', 'taller', 'shorter']);
    expect(
      availableArrangeActions(LAYOUT, widget('tickets', { defaultLayout: { x: 0, y: 3, w: 12, h: 2 } }))
    ).toEqual(['earlier', 'narrower', 'taller']);
  });

  it('never offers a height change on a content-sized widget', () => {
    expect(availableArrangeActions(LAYOUT, widget('revenue', { fitContent: true }))).toEqual([
      'earlier',
      'later',
      'wider',
      'narrower',
    ]);
  });
});

const LABELS: Record<ArrangeAction, string> = {
  earlier: 'Move earlier',
  later: 'Move later',
  wider: 'Make wider',
  narrower: 'Make narrower',
  taller: 'Make taller',
  shorter: 'Make shorter',
};

const arrange = (available: ArrangeAction[]) => ({
  available: vi.fn<DashboardArrange['available']>(() => available),
  apply: vi.fn<DashboardArrange['apply']>(),
  buttonLabel: (name?: string) => `Move or resize ${name ?? 'widget'}`,
  labels: LABELS,
});

describe('ArrangeMenu', () => {
  it('opens every move, enabling the possible ones, and applies the one chosen', () => {
    const pods = widget('pods', { title: 'Pods today' });
    const menu = arrange(['later', 'wider']);
    render(<DashboardWidgetCard widget={pods} editing dragLabel="Drag to move" arrange={menu} />);

    const button = screen.getByRole('button', { name: 'Move or resize Pods today' });
    expect(button).toHaveAttribute('aria-haspopup', 'menu');
    expect(button).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(button);
    expect(menu.available).toHaveBeenCalledWith(pods);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('menuitem')).toHaveLength(ARRANGE_ACTIONS.length);
    expect(screen.getByRole('menuitem', { name: 'Move earlier' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('menuitem', { name: 'Make wider' })).not.toHaveAttribute('aria-disabled');

    fireEvent.click(screen.getByRole('menuitem', { name: 'Make wider' }));
    expect(menu.apply).toHaveBeenCalledWith(pods, 'wider');
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes without a move when dismissed', () => {
    const menu = arrange(['later']);
    render(<DashboardWidgetCard widget={widget('pods')} editing dragLabel="Drag to move" arrange={menu} />);

    fireEvent.click(screen.getByRole('button', { name: 'Move or resize pods' }));
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });

    expect(menu.apply).not.toHaveBeenCalled();
  });

  it('floats beside the grip on a bare section', () => {
    const menu = arrange([]);
    render(
      <DashboardWidgetCard
        widget={widget('kpis', { bare: true, title: undefined })}
        editing
        dragLabel="Drag to move"
        arrange={menu}
      />
    );

    expect(screen.getByRole('button', { name: 'Move or resize widget' })).toBeInTheDocument();
  });

  it('is not offered while the dashboard is at rest', () => {
    render(<DashboardWidgetCard widget={widget('pods')} editing={false} dragLabel="Drag to move" arrange={arrange([])} />);

    expect(screen.queryByRole('button', { name: /Move or resize/ })).toBeNull();
  });
});
