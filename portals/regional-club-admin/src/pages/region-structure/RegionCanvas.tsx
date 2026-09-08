import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Background,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type Viewport,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Box, useTheme } from '@mui/material';
import RegionNodeCard, { type RegionNodeData } from './RegionNodeCard';
import CanvasControls from './CanvasControls';
import { layoutTree, type LayoutDirection } from './layout';
import { loadViewport, saveViewport } from './useRegionView';
import { NODE_TONE, type RegionNodeKind, type RegionTreeEdge, type RegionTreeNode } from '../queries';

/**
 * ONE stable map, module-scope.
 *
 * React Flow warns (and remounts every node) when `nodeTypes` changes identity
 * between renders, so this must never be built inside the component.
 */
const NODE_TYPES = { region: RegionNodeCard };
/** The two levels a click opens a drawer for. */
const OPENABLE: ReadonlySet<RegionNodeKind> = new Set<RegionNodeKind>(['HOST', 'CLUB_ADMIN']);

interface Props {
  nodes: RegionTreeNode[];
  edges: RegionTreeEdge[];
  direction: LayoutDirection;
  /** Ids that match the current search; every node matches when it is empty. */
  matched: ReadonlySet<string> | null;
  fullScreen: boolean;
  onToggleFullScreen: () => void;
  /** A HOST or CLUB_ADMIN box was clicked — `refId` is the user behind it. */
  onOpenNode: (kind: RegionNodeKind, refId: string, label: string) => void;
}

/**
 * The Region -> City -> Locality -> Club Admin -> Host canvas.
 *
 * The graph is read-only: nodes are not draggable and edges are not
 * connectable, because the shape is DERIVED from clubs and pods — dragging a
 * host under a different club admin would suggest a move the canvas cannot
 * make. Pan, zoom, search, orientation and full screen are the affordances, and
 * they are the ones a wide tree actually needs.
 */
function RegionCanvasInner({
  nodes,
  edges,
  direction,
  matched,
  fullScreen,
  onToggleFullScreen,
  onOpenNode,
}: Readonly<Props>) {
  const theme = useTheme();
  const { fitView } = useReactFlow();

  // Flipping the orientation moves every box, so the pan the reader had is now
  // pointing at empty canvas. Re-fit — but never on the FIRST render, or a
  // saved viewport would be thrown away the moment it was restored.
  const laidOut = useRef(false);
  useEffect(() => {
    if (!laidOut.current) {
      laidOut.current = true;
      return;
    }
    fitView({ padding: 0.2, duration: 300 });
  }, [direction, fitView]);

  const flowNodes = useMemo<Node<RegionNodeData>[]>(
    () =>
      layoutTree(nodes, direction).map((node) => ({
        id: node.id,
        type: 'region',
        position: { x: node.x, y: node.y },
        draggable: false,
        connectable: false,
        data: {
          kind: node.kind,
          label: node.label,
          sub_label: node.sub_label,
          count: node.count,
          openable: OPENABLE.has(node.kind),
          matched: !matched || matched.has(node.id),
          direction,
        },
      })),
    [nodes, direction, matched],
  );

  const flowEdges = useMemo<Edge[]>(
    () =>
      edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'smoothstep',
        animated: false,
        style: { stroke: theme.palette.divider, strokeWidth: 1.5 },
      })),
    [edges, theme.palette.divider],
  );

  const handleNodeClick: NodeMouseHandler = (_event, node) => {
    const data = node.data as RegionNodeData;
    if (!data.openable) return;
    // The node id ends in `/host:<userId>` or `/admin:<userId>` — the tree
    // builder's path encoding, and the only place the raw id survives.
    const marker = data.kind === 'HOST' ? '/host:' : '/admin:';
    const refId = node.id.split(marker)[1] ?? '';
    if (refId) onOpenNode(data.kind, refId, data.label);
  };

  const minimapNodeColor = useCallback(
    (node: Node) => {
      const tone = NODE_TONE[(node.data as RegionNodeData).kind];
      const palette = theme.palette as unknown as Record<string, { main: string }>;
      return palette[tone]?.main ?? theme.palette.text.secondary;
    },
    [theme],
  );

  const saved = useMemo(() => loadViewport(), []);
  const persist = (_event: unknown, viewport: Viewport) => saveViewport(viewport);

  return (
    <ReactFlow
      nodes={flowNodes}
      edges={flowEdges}
      nodeTypes={NODE_TYPES}
      onNodeClick={handleNodeClick}
      onMoveEnd={persist}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable
      defaultViewport={saved ?? undefined}
      fitView={!saved}
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.15}
      proOptions={{ hideAttribution: false }}
    >
      <Background color={theme.palette.divider} gap={20} />
      <CanvasControls fullScreen={fullScreen} onToggleFullScreen={onToggleFullScreen} />
      <MiniMap
        pannable
        zoomable
        nodeColor={minimapNodeColor}
        nodeStrokeWidth={2}
        maskColor={
          theme.palette.mode === 'dark' ? 'rgba(8, 12, 20, 0.72)' : 'rgba(226, 232, 240, 0.72)'
        }
        bgColor={theme.palette.background.paper}
        style={{
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 8,
          // React Flow's own stylesheet paints the minimap white; without this
          // it is an unreadable white block in the corner on the dark theme.
          backgroundColor: theme.palette.background.paper,
        }}
      />
    </ReactFlow>
  );
}

/** The provider is what `useReactFlow()` in the controls reads, so the canvas
 * owns it rather than asking every page to remember to mount one. */
export default function RegionCanvas(props: Readonly<Props>) {
  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <ReactFlowProvider>
        <RegionCanvasInner {...props} />
      </ReactFlowProvider>
    </Box>
  );
}
