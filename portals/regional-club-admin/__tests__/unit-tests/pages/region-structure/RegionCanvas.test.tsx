import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { ThemeProvider, createTheme, type Theme } from '@mui/material/styles';
import RegionCanvas from '../../../../src/pages/region-structure/RegionCanvas';
import type { LayoutDirection } from '../../../../src/pages/region-structure/layout';
import {
  ADMIN_NODE_ID,
  EMPTY_TREE_NODES,
  MEERA_NODE_ID,
  ROHAN_NODE_ID,
  TREE_EDGES,
  TREE_NODES,
} from '../../../mocks/region';
import { flowApi, lastFlow, resetFlowMock } from '../../../mocks/xyflow';

vi.mock('@xyflow/react', () => import('../../../mocks/xyflow'));

const LIGHT = createTheme();
const DARK = createTheme({ palette: { mode: 'dark' } });
const VIEWPORT_KEY = 'regional_canvas_viewport';
const CITY_ID = TREE_NODES[1].id;

interface CanvasProps {
  nodes?: typeof TREE_NODES;
  edges?: typeof TREE_EDGES;
  direction?: LayoutDirection;
  matched?: ReadonlySet<string> | null;
  fullScreen?: boolean;
}

const canvas = (props: CanvasProps, handlers: { onOpenNode: () => void; onToggleFullScreen: () => void }) => (
  <RegionCanvas
    nodes={props.nodes ?? TREE_NODES}
    edges={props.edges ?? TREE_EDGES}
    direction={props.direction ?? 'LR'}
    matched={props.matched ?? null}
    fullScreen={props.fullScreen ?? false}
    {...handlers}
  />
);

function Themed({ theme, children }: Readonly<{ theme: Theme; children: ReactNode }>) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

const renderCanvas = (props: CanvasProps = {}, theme: Theme = LIGHT) => {
  const handlers = { onOpenNode: vi.fn(), onToggleFullScreen: vi.fn() };
  const view = render(<Themed theme={theme}>{canvas(props, handlers)}</Themed>);
  const rerender = (next: CanvasProps) => view.rerender(<Themed theme={theme}>{canvas(next, handlers)}</Themed>);
  return { ...handlers, rerender };
};

const box = (id: string) => screen.getByTestId(`flow-node-${id}`);
const nodeData = (id: string) => lastFlow.props?.nodes.find((node) => node.id === id)?.data;

beforeEach(() => {
  resetFlowMock();
});

describe('RegionCanvas — the boxes', () => {
  it('draws every level with its kind, name and detail line', () => {
    renderCanvas();
    const host = within(box(ROHAN_NODE_ID));
    expect(host.getByText('Host')).toBeInTheDocument();
    expect(host.getByText('Rohan Mehta')).toBeInTheDocument();
    expect(host.getByText('rohan.m@duncit.com')).toBeInTheDocument();
    expect(within(box(ADMIN_NODE_ID)).getByText('Koramangala Runners, HSR Book Circle')).toBeInTheDocument();
    expect(within(box('region')).getByText('Region')).toBeInTheDocument();
    expect(screen.getAllByTestId('flow-edge')).toHaveLength(TREE_EDGES.length);
  });

  it('marks only Hosts and Club Admins as openable, and colours their counts', () => {
    renderCanvas();
    expect(box(ROHAN_NODE_ID)).toHaveAttribute('data-role', 'button');
    expect(box(ADMIN_NODE_ID)).toHaveAttribute('data-role', 'button');
    expect(box(CITY_ID)).toHaveAttribute('data-role', 'group');

    expect(within(box(ROHAN_NODE_ID)).getByText('6').closest('.MuiChip-root')).toHaveClass('MuiChip-colorSuccess');
    expect(within(box(CITY_ID)).getByText('1').closest('.MuiChip-root')).toHaveClass('MuiChip-colorDefault');
    expect(nodeData(ROHAN_NODE_ID)).toMatchObject({ openable: true, matched: true, direction: 'LR' });
    expect(nodeData(CITY_ID)).toMatchObject({ openable: false });
  });

  it('shows no count on an empty region’s lone box', () => {
    renderCanvas({ nodes: EMPTY_TREE_NODES, edges: [] });
    expect(within(box('region')).queryByText('0')).not.toBeInTheDocument();
  });

  it('dims every box a running search did not light', () => {
    renderCanvas({ matched: new Set(['region', ROHAN_NODE_ID]) });
    expect(nodeData(ROHAN_NODE_ID)?.matched).toBe(true);
    expect(nodeData(MEERA_NODE_ID)?.matched).toBe(false);
  });

  it('wires each box’s edges to its sides in the running direction', () => {
    renderCanvas();
    expect(within(box(ROHAN_NODE_ID)).getByTestId('handle-target')).toHaveAttribute('data-position', 'left');
    expect(within(box(ROHAN_NODE_ID)).getByTestId('handle-source')).toHaveAttribute('data-position', 'right');
  });
});

describe('RegionCanvas — orientation and viewport', () => {
  it('fits the region on the first paint when no view was saved, and re-fits only when turned', () => {
    const { rerender } = renderCanvas();
    expect(lastFlow.props?.fitView).toBe(true);
    expect(lastFlow.props?.defaultViewport).toBeUndefined();
    expect(flowApi.fitView).not.toHaveBeenCalled();

    rerender({ direction: 'TB' });
    expect(flowApi.fitView).toHaveBeenCalledWith({ padding: 0.2, duration: 300 });
    expect(within(box(ROHAN_NODE_ID)).getByTestId('handle-target')).toHaveAttribute('data-position', 'top');
    expect(within(box(ROHAN_NODE_ID)).getByTestId('handle-source')).toHaveAttribute('data-position', 'bottom');
  });

  it('restores the pan and zoom this browser saved instead of fitting', () => {
    localStorage.setItem(VIEWPORT_KEY, '{"x":-120,"y":40,"zoom":0.6}');
    renderCanvas();
    expect(lastFlow.props?.defaultViewport).toEqual({ x: -120, y: 40, zoom: 0.6 });
    expect(lastFlow.props?.fitView).toBe(false);
  });

  it('saves the viewport whenever a pan or zoom ends', () => {
    renderCanvas();
    act(() => lastFlow.props?.onMoveEnd?.(null, { x: 15, y: -30, zoom: 1.25 }));
    expect(localStorage.getItem(VIEWPORT_KEY)).toBe('{"x":15,"y":-30,"zoom":1.25}');
  });
});

describe('RegionCanvas — opening a box', () => {
  it('opens a Host’s pods and a Club Admin’s clubs, by the user behind the box', () => {
    const { onOpenNode } = renderCanvas();
    fireEvent.click(box(ROHAN_NODE_ID));
    expect(onOpenNode).toHaveBeenLastCalledWith('HOST', 'u-host-rohan', 'Rohan Mehta');
    fireEvent.click(box(ADMIN_NODE_ID));
    expect(onOpenNode).toHaveBeenLastCalledWith('CLUB_ADMIN', 'u-admin-asha', 'Asha Rao');
  });

  it('does nothing for the read-only levels', () => {
    const { onOpenNode } = renderCanvas();
    fireEvent.click(box(CITY_ID));
    fireEvent.click(box('region'));
    expect(onOpenNode).not.toHaveBeenCalled();
  });

  it('opens a focused box on Enter, for keyboard users', () => {
    const { onOpenNode } = renderCanvas();
    fireEvent.keyDown(box(MEERA_NODE_ID), { key: 'Enter' });
    expect(onOpenNode).toHaveBeenCalledWith('HOST', 'u-host-meera', 'Meera Iyer');
  });

  it('ignores other keys, and an Enter that did not come from a box', () => {
    const { onOpenNode } = renderCanvas();
    fireEvent.keyDown(box(MEERA_NODE_ID), { key: ' ' });
    fireEvent.keyDown(screen.getByRole('button', { name: 'Zoom in' }), { key: 'Enter' });
    expect(onOpenNode).not.toHaveBeenCalled();
  });
});

describe('RegionCanvas — chrome', () => {
  it('colours the minimap by level and paints it for the light theme', () => {
    renderCanvas();
    expect(screen.getByTestId(`minimap-node-${ROHAN_NODE_ID}`)).toHaveAttribute('data-color', LIGHT.palette.success.main);
    expect(screen.getByTestId('minimap-node-region')).toHaveAttribute('data-color', LIGHT.palette.primary.main);
    expect(screen.getByTestId('minimap')).toHaveAttribute('data-mask-color', 'rgba(226, 232, 240, 0.72)');
    expect(screen.getAllByTestId('flow-edge')[0]).toHaveAttribute('data-stroke', LIGHT.palette.divider);
  });

  it('paints the minimap mask dark on the dark theme', () => {
    renderCanvas({}, DARK);
    expect(screen.getByTestId('minimap')).toHaveAttribute('data-mask-color', 'rgba(8, 12, 20, 0.72)');
    expect(screen.getByTestId('minimap')).toHaveAttribute('data-bg-color', DARK.palette.background.paper);
  });

  it('hands full screen to its controls', () => {
    const { onToggleFullScreen } = renderCanvas({ fullScreen: true });
    fireEvent.click(screen.getByRole('button', { name: 'Exit full screen' }));
    expect(onToggleFullScreen).toHaveBeenCalledTimes(1);
  });
});
