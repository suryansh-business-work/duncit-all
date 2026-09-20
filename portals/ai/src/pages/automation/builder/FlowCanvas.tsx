import { useCallback, useMemo, type DragEvent, type KeyboardEvent } from 'react';
import {
  Background,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type IsValidConnection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Box, useTheme } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { isNodeKind, type NodeKind } from '../node-kinds';
import { exitsOf, type CanvasNode } from '../graph-io';
import type { FlowGraph } from './useFlowGraph';
import StepNode from './nodes/StepNode';
import { exitLabel } from './nodes/ExitHandles';
import CanvasControls from './CanvasControls';

/** ONE stable map: a new identity per render would remount every node. */
const NODE_TYPES = { step: StepNode };
/** The palette drags a step kind under this MIME type. */
export const DRAG_KIND = 'application/x-duncit-automation-kind';

interface Props {
  graph: FlowGraph;
  fullScreen: boolean;
  onToggleFullScreen: () => void;
}

function CanvasInner({ graph, fullScreen, onToggleFullScreen }: Readonly<Props>) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { screenToFlowPosition } = useReactFlow();
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode, select } = graph;

  // An arrow from a step with several exits says which one it leaves by.
  const decorated = useMemo<Edge[]>(() => {
    const byId = new Map(nodes.map((node) => [node.id, node]));
    return edges.map((edge) => {
      const source = byId.get(edge.source);
      const exits = source ? exitsOf(source.data.kind, source.data.config) : [];
      const label = source && exits.length > 1 ? exitLabel(edge.sourceHandle ?? 'next', source.data.config, t) : undefined;
      return {
        ...edge,
        type: 'smoothstep',
        label,
        labelStyle: { fill: theme.palette.text.secondary, fontSize: 11 },
        labelBgStyle: { fill: theme.palette.background.paper },
        markerEnd: { type: MarkerType.ArrowClosed, color: theme.palette.text.secondary },
        style: { stroke: theme.palette.text.secondary, strokeWidth: 1.5 },
      };
    });
  }, [edges, nodes, theme, t]);

  const isValidConnection = useCallback<IsValidConnection>((connection) => connection.source !== connection.target, []);

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const kind = event.dataTransfer.getData(DRAG_KIND);
      if (!isNodeKind(kind)) return;
      addNode(kind as NodeKind, screenToFlowPosition({ x: event.clientX, y: event.clientY }));
    },
    [addNode, screenToFlowPosition]
  );

  // React Flow focuses a step on Tab but only SELECTS it on click; Enter has to
  // do the same, or a keyboard user could never open the inspector (2.1.1).
  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== 'Enter') return;
      const target = event.target as HTMLElement;
      const id = target.closest<HTMLElement>('.react-flow__node')?.dataset.id;
      if (id) select(id);
    },
    [select]
  );

  return (
    <ReactFlow<CanvasNode, Edge>
      nodes={nodes}
      edges={decorated}
      nodeTypes={NODE_TYPES}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      isValidConnection={isValidConnection}
      onNodeClick={(_event, node) => select(node.id)}
      onPaneClick={() => select(null)}
      onNodesDelete={() => select(null)}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onKeyDown={onKeyDown}
      fitView
      fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
      minZoom={0.2}
      maxZoom={1.75}
      snapToGrid
      snapGrid={[10, 10]}
      deleteKeyCode={['Backspace', 'Delete']}
      proOptions={{ hideAttribution: false }}
      aria-label={t('ai.automation.builder.canvasLabel')}
    >
      <Background color={theme.palette.divider} gap={20} />
      <CanvasControls fullScreen={fullScreen} onToggleFullScreen={onToggleFullScreen} />
      <MiniMap
        pannable
        zoomable
        nodeColor={theme.palette.primary.light}
        maskColor={theme.palette.mode === 'dark' ? 'rgba(8, 12, 20, 0.72)' : 'rgba(226, 232, 240, 0.72)'}
        bgColor={theme.palette.background.paper}
        style={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 8, backgroundColor: theme.palette.background.paper }}
      />
    </ReactFlow>
  );
}

/** The provider lives here so the controls' `useReactFlow()` always has one. */
export default function FlowCanvas(props: Readonly<Props>) {
  return (
    <Box sx={{ width: '100%', height: '100%' }} data-testid="automation-canvas">
      <ReactFlowProvider>
        <CanvasInner {...props} />
      </ReactFlowProvider>
    </Box>
  );
}
