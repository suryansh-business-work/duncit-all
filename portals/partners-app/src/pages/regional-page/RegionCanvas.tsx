import { useMemo } from 'react';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Box } from '@mui/material';
import RegionNodeCard, { type RegionNodeData } from './RegionNodeCard';
import { layoutTree } from './layout';
import type { RegionTreeEdge, RegionTreeNode } from './queries';

/**
 * ONE stable map, module-scope.
 *
 * React Flow warns (and remounts every node) when `nodeTypes` changes identity
 * between renders, so this must never be built inside the component.
 */
const NODE_TYPES = { region: RegionNodeCard };

interface Props {
  nodes: RegionTreeNode[];
  edges: RegionTreeEdge[];
  /** Called with a HOST node's user id — the pods drawer's key. */
  onHostOpen: (hostUserId: string, label: string) => void;
}

/**
 * The Region -> City -> Locality -> Club Admin -> Host canvas.
 *
 * The graph is read-only: nodes are not draggable and edges are not
 * connectable, because the shape is DERIVED from clubs and pods — dragging a
 * host under a different club admin would suggest a move the canvas cannot
 * make. Pan, zoom and the minimap are the affordances, and they are the ones a
 * wide tree actually needs.
 */
export default function RegionCanvas({ nodes, edges, onHostOpen }: Readonly<Props>) {
  const flowNodes = useMemo<Node<RegionNodeData>[]>(
    () =>
      layoutTree(nodes).map((node) => ({
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
          openable: node.kind === 'HOST',
        },
      })),
    [nodes],
  );

  const flowEdges = useMemo<Edge[]>(
    () =>
      edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'smoothstep',
        animated: false,
      })),
    [edges],
  );

  const handleNodeClick: NodeMouseHandler = (_event, node) => {
    const data = node.data as RegionNodeData;
    if (!data.openable) return;
    // The node id ends in `/host:<userId>` — the tree builder's path encoding.
    const hostId = node.id.split('/host:')[1] ?? '';
    if (hostId) onHostOpen(hostId, data.label);
  };

  return (
    <Box
      sx={{
        height: { xs: 480, md: 620 },
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
        // The canvas paints its own surface; without this it borrows the page's
        // and the minimap's contrast collapses in dark mode.
        bgcolor: 'background.default',
      }}
    >
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={NODE_TYPES}
        onNodeClick={handleNodeClick}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        fitView
        proOptions={{ hideAttribution: false }}
      >
        <Background />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </Box>
  );
}
