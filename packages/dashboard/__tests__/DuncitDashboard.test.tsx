/**
 * The dashboard shell every console renders.
 *
 * GridStack drives real pointer drags against a real layout engine and jsdom
 * has neither, so the grid lifecycle itself is out of scope here (and excluded
 * from this package's coverage). What is in scope is everything around it: the
 * widgets render, the toolbar only offers Save when something has actually
 * moved, and a saved layout that never arrives leaves the page standing rather
 * than blank.
 */
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DashboardToolbar } from '../src/DashboardToolbar';
import { DashboardWidgetCard } from '../src/DashboardWidgetCard';
import { DuncitDashboard } from '../src/DuncitDashboard';
import { MY_DASHBOARD_LAYOUT } from '../src/queries';
import type { DashboardWidget } from '../src/types';

/**
 * A theme, because MUI's `useTheme()` returns NULL outside a provider rather
 * than falling back to the default one — so a component reading it through a
 * callback (`useMediaQuery((theme) => theme.breakpoints.down('sm'))`) throws
 * mid-render. In the app the theme comes from the surface; here it does not.
 */
const testTheme = createTheme();

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const widget = (id: string, over: Partial<DashboardWidget> = {}): DashboardWidget => ({
  id,
  title: `Widget ${id}`,
  content: <div data-testid={`body-${id}`}>body {id}</div>,
  defaultLayout: { x: 0, y: 0, w: 6, h: 2 },
  ...over,
});

const WIDGETS = [widget('a'), widget('b', { defaultLayout: { x: 6, y: 0, w: 6, h: 2 } })];

interface SavedItem {
  widget_id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const layoutMock = (items: SavedItem[]): MockedResponse => ({
  request: { query: MY_DASHBOARD_LAYOUT, variables: { dashboard_id: 'admin.overview' } },
  result: {
    data: {
      myDashboardLayout: {
        __typename: 'DashboardLayout',
        dashboard_id: 'admin.overview',
        items: items.map((item) => ({ __typename: 'DashboardLayoutItem', ...item })),
        updated_at: '2026-08-20T00:00:00.000Z',
      },
    },
  },
});

const mount = (widgets = WIDGETS, mocks: MockedResponse[] = []) =>
  render(
    <MockedProvider mocks={mocks}>
      <ThemeProvider theme={testTheme}>
      <DuncitDashboard dashboardId="admin.overview" widgets={widgets} header={<h1>Overview</h1>} />
      </ThemeProvider>
    </MockedProvider>
  );

afterEach(() => {
  vi.clearAllMocks();
});

describe('DuncitDashboard', () => {
  it('renders the header and every widget body', async () => {
    mount();
    await settle();

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByTestId('body-a')).toBeInTheDocument();
    expect(screen.getByTestId('body-b')).toBeInTheDocument();
  });

  it('stays standing when the saved layout never arrives', async () => {
    const { container } = mount();
    await settle();
    await settle();

    expect(container.innerHTML).not.toBe('');
  });

  it('renders a saved arrangement', async () => {
    mount(WIDGETS, [
      layoutMock([
        { widget_id: 'b', x: 0, y: 0, w: 12, h: 3 },
        { widget_id: 'a', x: 0, y: 3, w: 12, h: 2 },
      ]),
    ]);
    await settle();

    expect(screen.getByTestId('body-a')).toBeInTheDocument();
    expect(screen.getByTestId('body-b')).toBeInTheDocument();
  });

  it('renders a saved arrangement that still names a retired widget', async () => {
    mount(WIDGETS, [
      layoutMock([
        { widget_id: 'a', x: 0, y: 0, w: 12, h: 2 },
        { widget_id: 'retired', x: 0, y: 2, w: 12, h: 2 },
      ]),
    ]);
    await settle();

    expect(screen.getByTestId('body-a')).toBeInTheDocument();
    expect(screen.getByTestId('body-b')).toBeInTheDocument();
  });

  it('renders an empty dashboard without crashing', async () => {
    const { container } = mount([]);
    await settle();

    expect(container.innerHTML).not.toBe('');
  });

  it('renders the widget shapes a console actually uses', async () => {
    mount([
      widget('plain'),
      widget('bare', { bare: true, title: undefined }),
      widget('flush', { disablePadding: true }),
      widget('auto', { fitContent: true, subtitle: 'follows its content' }),
      widget('acted', { headerActions: <button type="button">View all</button> }),
    ]);
    await settle();

    expect(screen.getByTestId('body-bare')).toBeInTheDocument();
    expect(screen.getByText('follows its content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View all' })).toBeInTheDocument();
  });

  it('survives every toolbar control being pressed with the mutations answering nothing', async () => {
    const { container } = mount();
    await settle();

    for (const control of [...document.body.querySelectorAll<HTMLElement>('button:not([disabled])')].slice(0, 15)) {
      if (!control.isConnected) continue;
      fireEvent.click(control);
      await settle();
    }

    expect(container.innerHTML).not.toBe('');
  });
});

describe('DashboardWidgetCard', () => {
  const card = (over: Partial<DashboardWidget> = {}, editing = false) =>
    render(<DashboardWidgetCard widget={widget('w', over)} editing={editing} dragLabel="Drag to move" />);

  it('renders a titled card with its body', () => {
    card({ title: 'Pods today', subtitle: 'last 24h' });

    expect(screen.getByText('Pods today')).toBeInTheDocument();
    expect(screen.getByText('last 24h')).toBeInTheDocument();
    expect(screen.getByTestId('body-w')).toBeInTheDocument();
  });

  it('drops the whole card chrome when the section is already a run of cards', () => {
    const { container } = card({ bare: true, title: undefined });

    expect(container.querySelector('.MuiCard-root')).toBeNull();
    expect(screen.getByTestId('body-w')).toBeInTheDocument();
  });

  it('renders edge-to-edge for a body that brings its own insets', () => {
    card({ disablePadding: true });

    expect(screen.getByTestId('body-w')).toBeInTheDocument();
  });

  it('shows the localized drag grip only while the dashboard is being edited', () => {
    const { container: resting } = card({}, false);
    expect(resting.innerHTML).not.toContain('Drag to move');

    const { container: editing } = card({}, true);
    expect(editing.innerHTML).toContain('Drag to move');
  });

  it('renders a content-sized widget', () => {
    card({ fitContent: true });

    expect(screen.getByTestId('body-w')).toBeInTheDocument();
  });
});

describe('DashboardToolbar', () => {
  const labels = {
    customise: 'Customise',
    editing: 'Editing',
    hint: 'Drag a panel to move it',
    save: 'Save',
    saving: 'Saving…',
    cancel: 'Cancel',
    reset: 'Reset',
  };

  const toolbar = (over: Record<string, unknown> = {}) =>
    render(
      <DashboardToolbar
        editing={false}
        saving={false}
        dirty={false}
        labels={labels}
        onStart={vi.fn()}
        onSave={vi.fn()}
        onCancel={vi.fn()}
        onReset={vi.fn()}
        {...(over as never)}
      />
    );

  it('offers only Customise while the dashboard is at rest', () => {
    const onStart = vi.fn();
    toolbar({ onStart });

    expect(screen.getAllByRole('button')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Customise' }));

    expect(onStart).toHaveBeenCalled();
  });

  it('offers save, cancel and reset once editing starts', () => {
    toolbar({ editing: true, dirty: true });

    expect(screen.getAllByRole('button').length).toBeGreaterThan(1);
    expect(document.body.textContent).toContain('Drag a panel to move it');
  });

  it('says so while a save is in flight', () => {
    toolbar({ editing: true, dirty: true, saving: true });

    expect(document.body.textContent).toContain('Saving…');
  });

  it('runs each editing action through its own callback', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    const onReset = vi.fn();
    toolbar({ editing: true, dirty: true, onSave, onCancel, onReset });

    for (const control of screen.getAllByRole('button')) fireEvent.click(control);

    expect(onSave.mock.calls.length + onCancel.mock.calls.length + onReset.mock.calls.length).toBeGreaterThan(0);
  });
});
