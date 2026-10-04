import { useMemo } from 'react';
import { Background, Controls, MarkerType, ReactFlow, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Box, useTheme } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import type { PortMapRoute } from '@duncit/gql-types';
import { buildPortMapGraph, type PortMapNode } from './port-map-graph';
import { NODE_TYPES } from './PortMapNodes';

interface Props {
  routes: PortMapRoute[];
  /** Clicking a domain narrows the map to it. */
  onSelectDomain: (domain: string) => void;
}

/**
 * Read-only React Flow map: every domain on the left, the local port nginx
 * hands it to on the right. Nothing can be dragged or connected — the vhosts
 * on the server are the source of truth, and this only draws them.
 */
export default function PortMapCanvas({ routes, onSelectDomain }: Readonly<Props>) {
  const theme = useTheme();
  const { t } = useTranslation();
  const graph = useMemo(() => buildPortMapGraph(routes), [routes]);

  const edges = useMemo<Edge[]>(
    () =>
      graph.edges.map((edge) => ({
        ...edge,
        type: 'smoothstep',
        labelStyle: { fill: theme.palette.text.secondary, fontSize: theme.typography.caption.fontSize },
        labelBgStyle: { fill: theme.palette.background.paper },
        markerEnd: { type: MarkerType.ArrowClosed, color: theme.palette.text.secondary },
        style: {
          stroke: theme.palette.text.secondary,
          strokeDasharray: edge.data?.enabled ? undefined : '6 4',
        },
      })),
    [graph.edges, theme]
  );

  // The map grows with the routes it draws so a long list scrolls the page, not a tiny viewport.
  const height = Math.min(Math.max(graph.nodes.length * 36, 360), 1200);

  return (
    <Box
      sx={{ height, border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'background.default' }}
      data-testid="port-map-canvas"
    >
      <ReactFlow<PortMapNode, Edge>
        nodes={graph.nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        nodesDraggable={false}
        nodesConnectable={false}
        edgesFocusable={false}
        onNodeClick={(_event, node) => {
          if (node.type === 'domain') onSelectDomain(node.data.domain);
        }}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.2}
        maxZoom={1.5}
        aria-label={t('tech.portMap.canvasLabel')}
      >
        <Background color={theme.palette.divider} gap={20} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </Box>
  );
}
