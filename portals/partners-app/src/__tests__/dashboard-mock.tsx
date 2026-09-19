/**
 * A pass-through stand-in for `@duncit/dashboard`.
 *
 * The real grid lays its widgets out with GridStack, which measures the DOM and
 * does nothing useful in jsdom; the dashboard package has its own suite for that.
 * A page's suite cares about what it hands the grid — its header and each
 * widget's title, header actions and content — so this renders exactly those.
 *
 * Use it with `vi.mock('@duncit/dashboard', () => import('<path>/__tests__/dashboard-mock'))`.
 */
import type { ReactNode } from 'react';

interface MockWidget {
  id: string;
  title?: ReactNode;
  headerActions?: ReactNode;
  content: ReactNode;
}

interface MockDashboardProps {
  header?: ReactNode;
  widgets: readonly MockWidget[];
}

export function DuncitDashboard({ header, widgets }: Readonly<MockDashboardProps>) {
  return (
    <div data-testid="dashboard">
      {header}
      {widgets.map((widget) => (
        <section key={widget.id} data-testid={`widget-${widget.id}`}>
          <h2>{widget.title}</h2>
          {widget.headerActions}
          {widget.content}
        </section>
      ))}
    </div>
  );
}
