/**
 * The card chrome's less common shapes — a header with no title, a bare
 * section being dragged, a card with nothing to put in a header at all — and
 * the grid's fallback for a widget the resolved layout does not name.
 */
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';

import { DashboardGrid } from '../src/DashboardGrid';
import { DashboardWidgetCard } from '../src/DashboardWidgetCard';
import { DRAG_HANDLE_CLASS } from '../src/useGridStack';
import type { DashboardWidget } from '../src/types';

const GRIP = `.${DRAG_HANDLE_CLASS}`;

const widget = (id: string, over: Partial<DashboardWidget> = {}): DashboardWidget => ({
  id,
  title: undefined,
  content: <div data-testid={`body-${id}`}>body {id}</div>,
  defaultLayout: { x: 0, y: 0, w: 6, h: 2 },
  ...over,
});

const card = (over: Partial<DashboardWidget>, editing = false) =>
  render(<DashboardWidgetCard widget={widget('w', over)} editing={editing} dragLabel="Drag to move" />);

describe('DashboardWidgetCard chrome', () => {
  it('floats the grip over a bare section while editing', () => {
    const { container } = card({ bare: true }, true);

    expect(container.querySelector('[aria-label="Drag to move"]')).toHaveClass(DRAG_HANDLE_CLASS);
    expect(container.querySelector('.MuiCard-root')).toBeNull();
    expect(screen.getByTestId('body-w')).toBeInTheDocument();
  });

  it('renders a header for a subtitle alone', () => {
    card({ subtitle: 'last 24h' });

    expect(screen.getByText('last 24h')).toBeInTheDocument();
    expect(screen.queryByText('Widget w')).toBeNull();
  });

  it('renders a header for actions alone', () => {
    card({ headerActions: <button type="button">View all</button> });

    expect(screen.getByRole('button', { name: 'View all' })).toBeInTheDocument();
  });

  it('grows a header holding just the grip when an untitled card is being edited', () => {
    const { container } = card({}, true);

    expect(container.querySelector('[aria-label="Drag to move"]')).toHaveClass(DRAG_HANDLE_CLASS);
    expect(container.querySelector('.MuiTypography-root')).toBeNull();
  });

  it('renders no header at all for an untitled card at rest', () => {
    const { container } = card({});

    expect(container.querySelector('.MuiCard-root')).not.toBeNull();
    expect(container.querySelector(GRIP)).toBeNull();
    expect(container.querySelector('.MuiTypography-root')).toBeNull();
    expect(screen.getByTestId('body-w')).toBeInTheDocument();
  });

  it('keeps a content-sized bare section at its natural height', () => {
    card({ bare: true, fitContent: true });

    expect(screen.getByTestId('body-w')).toBeInTheDocument();
  });
});

describe('DashboardGrid', () => {
  it('seats a widget the layout does not name on its declared slot', () => {
    const widgets = [
      widget('pods', { title: 'Pods' }),
      widget('revenue', { title: 'Revenue', defaultLayout: { x: 9, y: 4, w: 9, h: 3 }, fitContent: true }),
    ];
    const { container } = render(
      <DashboardGrid
        widgets={widgets}
        layout={[{ id: 'pods', x: 6, y: 0, w: 6, h: 2 }]}
        editing={false}
        dragLabel="Drag to move"
        containerRef={createRef<HTMLDivElement>()}
      />
    );

    const pods = container.querySelector('[gs-id="pods"]');
    expect(pods).toHaveAttribute('gs-x', '6');
    expect(pods).not.toHaveAttribute('gs-size-to-content');

    // Declared at x=9 w=9: normalised back inside the twelve columns.
    const revenue = container.querySelector('[gs-id="revenue"]');
    expect(revenue).toHaveAttribute('gs-x', '3');
    expect(revenue).toHaveAttribute('gs-y', '4');
    expect(revenue).toHaveAttribute('gs-w', '9');
    expect(revenue).toHaveAttribute('gs-size-to-content', 'true');
  });
});
