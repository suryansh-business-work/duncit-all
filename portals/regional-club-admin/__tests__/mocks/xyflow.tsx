import { createContext, useContext, type ComponentType, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { vi } from 'vitest';

/**
 * A stand-in for `@xyflow/react`. The real canvas measures every node through
 * ResizeObserver and pans through d3-zoom, none of which jsdom can do, so the
 * boxes would never be laid out. This keeps the library's CONTRACT — each node
 * rendered through `nodeTypes` inside a `.react-flow__node` wrapper carrying
 * `data-id`, `onNodeClick(event, node)`, `onMoveEnd(event, viewport)`, the
 * wrapper's `onKeyDown`, and the minimap asking `nodeColor(node)` per node — so
 * the console's own code runs exactly as it does against the real one.
 */

interface FlowNode {
  id: string;
  type: string;
  ariaRole?: string;
  data: Record<string, unknown>;
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  style?: { stroke?: string };
}

interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

interface FlowProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  nodeTypes: Record<string, ComponentType<{ id: string; data: Record<string, unknown> }>>;
  onNodeClick?: (event: MouseEvent, node: FlowNode) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
  onMoveEnd?: (event: unknown, viewport: Viewport) => void;
  defaultViewport?: Viewport;
  fitView?: boolean;
  children?: ReactNode;
}

/** The viewport API `useReactFlow()` hands the canvas and its controls. */
export const flowApi = {
  fitView: vi.fn(),
  zoomIn: vi.fn(),
  zoomOut: vi.fn(),
};

/** The props the canvas last rendered `<ReactFlow>` with. */
export const lastFlow: { props: FlowProps | null } = { props: null };

export function resetFlowMock(): void {
  flowApi.fitView.mockClear();
  flowApi.zoomIn.mockClear();
  flowApi.zoomOut.mockClear();
  lastFlow.props = null;
}

export const useReactFlow = () => flowApi;

export const Position = { Left: 'left', Top: 'top', Right: 'right', Bottom: 'bottom' } as const;

const NodesContext = createContext<FlowNode[]>([]);

export function ReactFlowProvider({ children }: Readonly<{ children: ReactNode }>) {
  return <>{children}</>;
}

export function ReactFlow(props: Readonly<FlowProps>) {
  lastFlow.props = props;
  const { nodes, edges, nodeTypes, onNodeClick, onKeyDown, children } = props;
  return (
    <NodesContext.Provider value={nodes}>
      <div data-testid="react-flow" onKeyDown={onKeyDown}>
        {nodes.map((node) => {
          const NodeCard = nodeTypes[node.type];
          return (
            <div
              key={node.id}
              className="react-flow__node"
              data-id={node.id}
              data-testid={`flow-node-${node.id}`}
              data-role={node.ariaRole}
              onClick={(event) => onNodeClick?.(event, node)}
            >
              <NodeCard id={node.id} data={node.data} />
            </div>
          );
        })}
        {edges.map((edge) => (
          <span
            key={edge.id}
            data-testid="flow-edge"
            data-source={edge.source}
            data-target={edge.target}
            data-stroke={edge.style?.stroke}
          />
        ))}
        {children}
      </div>
    </NodesContext.Provider>
  );
}

export function Background({ color }: Readonly<{ color?: string }>) {
  return <div data-testid="flow-background" data-color={color} />;
}

export function MiniMap({
  nodeColor,
  maskColor,
  bgColor,
}: Readonly<{ nodeColor: (node: FlowNode) => string; maskColor?: string; bgColor?: string }>) {
  const nodes = useContext(NodesContext);
  return (
    <div data-testid="minimap" data-mask-color={maskColor} data-bg-color={bgColor}>
      {nodes.map((node) => (
        <span key={node.id} data-testid={`minimap-node-${node.id}`} data-color={nodeColor(node)} />
      ))}
    </div>
  );
}

export function Panel({ position, children }: Readonly<{ position: string; children: ReactNode }>) {
  return <div data-testid={`flow-panel-${position}`}>{children}</div>;
}

export function Handle({ type, position }: Readonly<{ type: string; position: string }>) {
  return <span data-testid={`handle-${type}`} data-position={position} />;
}
