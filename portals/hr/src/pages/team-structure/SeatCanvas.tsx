import { useMemo } from 'react';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Box, useTheme } from '@mui/material';
import SeatCard, { KIND_TONE, type SeatData } from './SeatCard';
import { layoutSeats } from './layout';
import type { TeamNode } from './types';

/** One stable map, module scope — see SeatCard. */
const NODE_TYPES = { seat: SeatCard };

interface Props {
  nodes: TeamNode[];
  currency: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Absent on the public view: the chart is then read-only. */
  onAddChild?: (parentId: string) => void;
  /** Drag from one seat's bottom handle to another's top handle to re-parent it. */
  onReparent?: (childId: string, parentId: string) => void;
}

function SeatCanvasInner({ nodes, currency, selectedId, onSelect, onAddChild, onReparent }: Readonly<Props>) {
  const theme = useTheme();
  const editable = Boolean(onReparent);

  const flowNodes = useMemo<Node<SeatData>[]>(() => {
    const at = new Map(layoutSeats(nodes).map((p) => [p.id, p]));
    return nodes.map((node) => ({
      id: node.id,
      type: 'seat',
      position: { x: at.get(node.id)?.x ?? 0, y: at.get(node.id)?.y ?? 0 },
      draggable: false,
      connectable: editable,
      selected: node.id === selectedId,
      data: { node, currency, onAddChild: onAddChild ?? null },
    }));
  }, [nodes, currency, selectedId, onAddChild, editable]);

  const flowEdges = useMemo<Edge[]>(() => {
    const present = new Set(nodes.map((n) => n.id));
    return nodes
      .filter((n) => n.parent_id && present.has(n.parent_id))
      .map((n) => ({
        id: `${n.parent_id}-${n.id}`,
        source: n.parent_id as string,
        target: n.id,
        type: 'smoothstep',
        style: { stroke: theme.palette.divider, strokeWidth: 1.5 },
      }));
  }, [nodes, theme.palette.divider]);

  const handleConnect = (connection: Connection) => {
    if (connection.source && connection.target && connection.source !== connection.target) {
      onReparent?.(connection.target, connection.source);
    }
  };

  return (
    <ReactFlow
      nodes={flowNodes}
      edges={flowEdges}
      nodeTypes={NODE_TYPES}
      nodesDraggable={false}
      nodesConnectable={editable}
      onConnect={handleConnect}
      onNodeClick={(_event, node) => onSelect(node.id)}
      onPaneClick={() => onSelect(null)}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.1}
    >
      <Background color={theme.palette.divider} gap={20} />
      <Controls showInteractive={false} />
      <MiniMap
        pannable
        zoomable
        nodeColor={(node) => {
          const kind = (node.data as SeatData).node.kind;
          return theme.palette[KIND_TONE[kind]].main;
        }}
        bgColor={theme.palette.background.paper}
      />
    </ReactFlow>
  );
}

/** The provider is owned here so no page has to remember to mount one. */
export default function SeatCanvas(props: Readonly<Props>) {
  return (
    <Box sx={{ width: '100%', height: '100%', minHeight: 480 }}>
      <ReactFlowProvider>
        <SeatCanvasInner {...props} />
      </ReactFlowProvider>
    </Box>
  );
}
