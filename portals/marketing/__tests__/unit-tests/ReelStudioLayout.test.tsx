import { Children, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, renderHook, screen, waitFor, within } from '@testing-library/react';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { MY_REEL_STUDIO_LAYOUT, RESET_REEL_STUDIO_LAYOUT, SAVE_REEL_STUDIO_LAYOUT } from '../../src/pages/reels/queries';
import LayoutMenu from '../../src/pages/reels/studio/layout/LayoutMenu';
import { defaultLayout, withMode, type PaneId, type StudioLayout } from '../../src/pages/reels/studio/layout/layoutModel';
import SplitDivider from '../../src/pages/reels/studio/layout/SplitDivider';
import StudioWorkspace, { type PaneContent } from '../../src/pages/reels/studio/layout/StudioWorkspace';
import { useStudioLayout, type StudioLayoutState } from '../../src/pages/reels/studio/layout/useStudioLayout';
import { renderWithProviders } from '../testkit';
import { answerQuery, mutationOf, resetApollo } from '../mocks/reel-apollo-mock';

vi.mock('@apollo/client/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client/react')>()),
  ...(await import('../mocks/reel-apollo-mock')).hooks,
}));

vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

/** jsdom has no layout, so the split library would measure zero and draw nothing; this stands in with its contract. */
vi.mock('react-split-pane', () => ({
  SplitPane: ({ children, direction, onResizeEnd }: { children: ReactNode; direction: string; onResizeEnd?: (sizes: number[]) => void }) => (
    <div data-testid={`split-${direction}`}>
      {children}
      <button type="button" data-testid={`end-drag-${direction}`} onClick={() => onResizeEnd?.(Children.toArray(children).map((_, index) => 300 + index * 100))} />
    </div>
  ),
  Pane: ({ children, defaultSize, maxSize }: { children: ReactNode; defaultSize?: number; maxSize?: number }) => (
    <div data-pane data-default-size={defaultSize ?? 'rest'} data-max-size={maxSize ?? 'none'}>
      {children}
    </div>
  ),
}));

const TITLES: Record<PaneId, string> = { SOURCES: 'Footage', PREVIEW: 'Player', SIDE: 'Chat, Create and Edit', TIMELINE: 'Timeline' };
const panes: Record<PaneId, PaneContent> = {
  SOURCES: { title: TITLES.SOURCES, content: <div data-testid="content-sources" /> },
  PREVIEW: { title: TITLES.PREVIEW, content: <div data-testid="content-preview" /> },
  SIDE: { title: TITLES.SIDE, content: <div data-testid="content-side" /> },
  TIMELINE: { title: TITLES.TIMELINE, tour: 'studio-timeline', content: <div data-testid="content-timeline" /> },
};

const state = (layout: StudioLayout = defaultLayout(), over: Partial<StudioLayoutState> = {}): StudioLayoutState => ({
  layout,
  revision: 0,
  dirty: false,
  saving: false,
  restoring: false,
  setMode: vi.fn(),
  setSize: vi.fn(),
  setRect: vi.fn(),
  save: vi.fn(async () => undefined),
  restore: vi.fn(async () => undefined),
  ...over,
});

function wideScreen(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

beforeEach(() => resetApollo());
afterEach(() => wideScreen(false));

describe('StudioWorkspace on a wide screen', () => {
  beforeEach(() => wideScreen(true));

  it('lays footage, player and side panel across, the timeline under them, each within its limits', async () => {
    const layout = state();
    renderWithProviders(<StudioWorkspace state={layout} panes={panes} />);
    const across = await screen.findByTestId('split-horizontal');
    const sizes = [...across.querySelectorAll(':scope > [data-pane]')].map((pane) => pane.getAttribute('data-default-size'));
    // The player has no size of its own: it takes what the others leave.
    expect(sizes).toEqual(['320', 'rest', '380']);
    expect(screen.getByTestId('split-vertical')).toContainElement(screen.getByTestId('content-timeline'));
    expect(screen.getByTestId('reel-pane-timeline').parentElement).toHaveAttribute('data-tour', 'studio-timeline');

    fireEvent.click(screen.getByTestId('end-drag-horizontal'));
    expect(layout.setSize).toHaveBeenCalledWith('SOURCES', 300);
    expect(layout.setSize).toHaveBeenCalledWith('SIDE', 500);
    fireEvent.click(screen.getByTestId('end-drag-vertical'));
    expect(layout.setSize).toHaveBeenCalledWith('TIMELINE', 400);
  });

  it('pops a pane out and closes one from its bar', async () => {
    const layout = state();
    renderWithProviders(<StudioWorkspace state={layout} panes={panes} />);
    fireEvent.click(await screen.findByTestId('reel-pane-popout-side'));
    expect(layout.setMode).toHaveBeenCalledWith('SIDE', 'POPPED');
    fireEvent.click(screen.getByTestId('reel-pane-close-sources'));
    expect(layout.setMode).toHaveBeenCalledWith('SOURCES', 'CLOSED');
    expect(screen.getByTestId('reel-pane-close-sources')).toHaveAccessibleName('Close Footage');
  });

  it('draws a popped pane in its own window, which docks back or closes', async () => {
    const layout = state(withMode(defaultLayout(), 'SIDE', 'POPPED'));
    renderWithProviders(<StudioWorkspace state={layout} panes={panes} />);
    const window = await screen.findByTestId('reel-pane-window-side');
    expect(within(window).getByTestId('content-side')).toBeInTheDocument();
    expect(screen.queryByTestId('reel-pane-side')).not.toBeInTheDocument();
    // With the side panel away, the player still takes what is left.
    const sizes = [...screen.getByTestId('split-horizontal').querySelectorAll(':scope > [data-pane]')].map((pane) => pane.getAttribute('data-default-size'));
    expect(sizes).toEqual(['320', 'rest']);

    fireEvent.click(within(window).getByTestId('reel-pane-dock-side'));
    expect(layout.setMode).toHaveBeenCalledWith('SIDE', 'DOCKED');
  });

  it('shows a lone docked pane without a split, and the timeline alone when the row is gone', async () => {
    let layout = defaultLayout();
    for (const id of ['SOURCES', 'SIDE'] as const) layout = withMode(layout, id, 'CLOSED');
    const { unmount } = renderWithProviders(<StudioWorkspace state={state(withMode(layout, 'TIMELINE', 'CLOSED'))} panes={panes} />);
    expect(await screen.findByTestId('content-preview')).toBeInTheDocument();
    expect(screen.queryByTestId('split-horizontal')).not.toBeInTheDocument();
    expect(screen.queryByTestId('split-vertical')).not.toBeInTheDocument();
    unmount();

    renderWithProviders(<StudioWorkspace state={state(withMode(layout, 'PREVIEW', 'CLOSED'))} panes={panes} />);
    expect(await screen.findByTestId('content-timeline')).toBeInTheDocument();
    expect(screen.queryByTestId('split-vertical')).not.toBeInTheDocument();
  });

  it('when every pane is closed, says so and offers the default view', async () => {
    let layout = defaultLayout();
    for (const id of ['SOURCES', 'PREVIEW', 'SIDE', 'TIMELINE'] as const) layout = withMode(layout, id, 'CLOSED');
    const studio = state(layout);
    renderWithProviders(<StudioWorkspace state={studio} panes={panes} />);
    expect(await screen.findByTestId('reel-layout-empty')).toHaveTextContent('Every pane is closed');
    fireEvent.click(screen.getByTestId('reel-layout-empty-restore'));
    expect(studio.restore).toHaveBeenCalledTimes(1);
  });
});

describe('StudioWorkspace on a narrow screen', () => {
  it('stacks the docked panes so the page scrolls, with no splits', () => {
    renderWithProviders(<StudioWorkspace state={state(withMode(defaultLayout(), 'SOURCES', 'CLOSED'))} panes={panes} />);
    const stacked = screen.getByTestId('reel-workspace-stacked');
    expect(within(stacked).getAllByRole('region').map((pane) => pane.getAttribute('aria-label'))).toEqual(['Player', 'Chat, Create and Edit', 'Timeline']);
    expect(screen.queryByTestId('split-horizontal')).not.toBeInTheDocument();
  });
});

describe('LayoutMenu', () => {
  it('shows and hides panes, and says when the arrangement is not saved', () => {
    const studio = state(withMode(defaultLayout(), 'TIMELINE', 'CLOSED'), { dirty: true });
    renderWithProviders(<LayoutMenu state={studio} titles={TITLES} />);
    expect(screen.getByTestId('reel-layout-button')).toHaveTextContent('Layout (unsaved)');
    fireEvent.click(screen.getByTestId('reel-layout-button'));
    expect(screen.getByTestId('reel-layout-toggle-timeline')).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByTestId('reel-layout-toggle-sources')).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByTestId('reel-layout-toggle-timeline'));
    expect(studio.setMode).toHaveBeenCalledWith('TIMELINE', 'DOCKED');
    fireEvent.click(screen.getByTestId('reel-layout-toggle-sources'));
    expect(studio.setMode).toHaveBeenCalledWith('SOURCES', 'CLOSED');
  });

  it('saves only when something changed, and restores the default view', async () => {
    const clean = state();
    const { unmount } = renderWithProviders(<LayoutMenu state={clean} titles={TITLES} />);
    fireEvent.click(screen.getByTestId('reel-layout-button'));
    expect(screen.getByTestId('reel-layout-save')).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(screen.getByTestId('reel-layout-restore'));
    await waitFor(() => expect(clean.restore).toHaveBeenCalledTimes(1));
    unmount();

    const changed = state(defaultLayout(), { dirty: true });
    renderWithProviders(<LayoutMenu state={changed} titles={TITLES} />);
    fireEvent.click(screen.getByTestId('reel-layout-button'));
    fireEvent.click(screen.getByTestId('reel-layout-save'));
    await waitFor(() => expect(changed.save).toHaveBeenCalledTimes(1));
  });
});

describe('SplitDivider', () => {
  it('is a keyboard window splitter that says its size and limits', () => {
    const onKeyDown = vi.fn();
    renderWithProviders(<SplitDivider direction="horizontal" index={0} isDragging={false} disabled={false} onPointerDown={vi.fn()} onKeyDown={onKeyDown} currentSize={320.4} minSize={240} maxSize={Infinity} />);
    const bar = screen.getByRole('separator', { name: 'Resize panes' });
    expect(bar).toHaveAttribute('tabindex', '0');
    expect(bar).toHaveAttribute('aria-orientation', 'vertical');
    expect(bar).toHaveAttribute('aria-valuenow', '320');
    expect(bar).toHaveAttribute('aria-valuemin', '240');
    expect(bar).not.toHaveAttribute('aria-valuemax');
    fireEvent.keyDown(bar, { key: 'ArrowRight' });
    expect(onKeyDown).toHaveBeenCalledTimes(1);
  });

  it('cannot be reached by keyboard when the split is not resizable', () => {
    renderWithProviders(<SplitDivider direction="vertical" index={1} isDragging disabled onPointerDown={vi.fn()} onKeyDown={vi.fn()} maxSize={640} />);
    const bar = screen.getByTestId('reel-split-divider-vertical-1');
    expect(bar).toHaveAttribute('tabindex', '-1');
    expect(bar).toHaveAttribute('aria-orientation', 'horizontal');
    expect(bar).toHaveAttribute('aria-valuemax', '640');
  });
});

describe('useStudioLayout', () => {
  const savedPanes = [{ id: 'SIDE', mode: 'POPPED', size: 380, x: 40, y: 50, width: 600, height: 500 }];

  it('starts on the saved arrangement, tracks changes, and saves them to the account', async () => {
    answerQuery(MY_REEL_STUDIO_LAYOUT, { data: { myReelStudioLayout: { panes: savedPanes, updated_at: '2026-11-24T10:00:00Z' } } });
    const save = mutationOf(SAVE_REEL_STUDIO_LAYOUT).mockResolvedValue({});
    const { result } = renderHook(() => useStudioLayout());
    await waitFor(() => expect(result.current.layout.SIDE).toMatchObject({ mode: 'POPPED', x: 40, width: 600 }));
    expect(result.current.dirty).toBe(false);
    const revision = result.current.revision;

    act(() => result.current.setMode('TIMELINE', 'CLOSED'));
    act(() => result.current.setSize('SOURCES', 410));
    act(() => result.current.setRect('SIDE', { x: 1, y: 2, width: 700, height: 400 }));
    expect(result.current.dirty).toBe(true);
    expect(result.current.revision).toBe(revision);

    await act(() => result.current.save());
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ variables: { panes: expect.arrayContaining([expect.objectContaining({ id: 'TIMELINE', mode: 'CLOSED' }), expect.objectContaining({ id: 'SOURCES', size: 410 })]) } }));
    expect(notifySuccess).toHaveBeenCalledWith('Layout saved to your account');
  });

  it('restores the default view and forgets the saved one', async () => {
    answerQuery(MY_REEL_STUDIO_LAYOUT, { data: { myReelStudioLayout: { panes: savedPanes, updated_at: null } } });
    const reset = mutationOf(RESET_REEL_STUDIO_LAYOUT).mockResolvedValue({});
    const { result } = renderHook(() => useStudioLayout());
    await waitFor(() => expect(result.current.layout.SIDE.mode).toBe('POPPED'));
    await act(() => result.current.restore());
    expect(reset).toHaveBeenCalledTimes(1);
    expect(result.current.layout).toEqual(defaultLayout());
    expect(notifySuccess).toHaveBeenCalledWith('The default view is back');
  });

  it('says why a save or a restore failed, and keeps what is on screen', async () => {
    answerQuery(MY_REEL_STUDIO_LAYOUT, { data: { myReelStudioLayout: null } });
    mutationOf(SAVE_REEL_STUDIO_LAYOUT).mockRejectedValue(new Error('A pane is listed twice.'));
    mutationOf(RESET_REEL_STUDIO_LAYOUT).mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useStudioLayout());
    act(() => result.current.setMode('PREVIEW', 'CLOSED'));
    await act(() => result.current.save());
    expect(notifyError).toHaveBeenCalledWith('A pane is listed twice.');
    await act(() => result.current.restore());
    expect(notifyError).toHaveBeenCalledWith('offline');
    expect(result.current.layout.PREVIEW.mode).toBe('CLOSED');
  });
});
