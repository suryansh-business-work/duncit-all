import { useCallback, useMemo, useState } from 'react';
import { applyEdgeChanges, applyNodeChanges, type Connection, type Edge, type EdgeChange, type NodeChange } from '@xyflow/react';
import { NODE_KINDS, type NodeKind } from '../node-kinds';
import { exitsOf, newId, nextPosition, toCanvasEdges, toCanvasNodes, type CanvasNode } from '../graph-io';
import type { AutomationChannel, AutomationFlow, FlowIssue, NodeData } from '../types';

/**
 * The canvas document: its steps, its arrows, which step is selected and
 * whether anything has changed since the last save.
 *
 * One rule keeps the graph honest: an exit leads to at most one step. Connecting
 * an exit that already leads somewhere re-points it, and a step whose exits
 * shrink (a classify label removed) drops the arrows that left by them.
 */
export function useFlowGraph(channel: AutomationChannel) {
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const applyIssues = useCallback((issues: readonly FlowIssue[]) => {
    setNodes((current) =>
      current.map((node) => ({
        ...node,
        data: { ...node.data, issues: issues.filter((issue) => issue.node_id === node.id).map((issue) => issue.message) },
      }))
    );
  }, []);

  const load = useCallback(
    (flow: AutomationFlow) => {
      setNodes(toCanvasNodes(flow.nodes));
      setEdges(toCanvasEdges(flow.edges));
      setDirty(false);
      applyIssues(flow.issues);
    },
    [applyIssues]
  );

  const onNodesChange = useCallback((changes: NodeChange<CanvasNode>[]) => {
    setNodes((current) => applyNodeChanges(changes, current));
    if (changes.some((change) => change.type === 'position' || change.type === 'remove')) setDirty(true);
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((current) => applyEdgeChanges(changes, current));
    if (changes.some((change) => change.type === 'remove')) setDirty(true);
  }, []);

  const connect = useCallback((source: string, sourceHandle: string, target: string) => {
    if (source === target) return;
    setEdges((current) => [
      ...current.filter((edge) => !(edge.source === source && (edge.sourceHandle ?? 'next') === sourceHandle)),
      { id: newId('e'), source, sourceHandle, target },
    ]);
    setDirty(true);
  }, []);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) connect(connection.source, connection.sourceHandle ?? 'next', connection.target);
    },
    [connect]
  );

  const disconnect = useCallback((source: string, sourceHandle: string) => {
    setEdges((current) => current.filter((edge) => !(edge.source === source && (edge.sourceHandle ?? 'next') === sourceHandle)));
    setDirty(true);
  }, []);

  const addNode = useCallback(
    (kind: NodeKind, position?: { x: number; y: number }) => {
      const id = newId('n');
      setNodes((current) => [
        ...current,
        {
          id,
          type: 'step',
          position: position ?? nextPosition(current),
          deletable: true,
          data: { kind, config: NODE_KINDS[kind].defaults(channel), issues: [] },
        },
      ]);
      setSelectedId(id);
      setDirty(true);
    },
    [channel]
  );

  const updateConfig = useCallback((id: string, config: NodeData) => {
    let exits: string[] | null = null;
    setNodes((current) =>
      current.map((node) => {
        if (node.id !== id) return node;
        exits = exitsOf(node.data.kind, config);
        return { ...node, data: { ...node.data, config } };
      })
    );
    setEdges((current) => {
      if (!exits) return current;
      const live = new Set(exits);
      return current.filter((edge) => edge.source !== id || live.has(edge.sourceHandle ?? 'next'));
    });
    setDirty(true);
  }, []);

  const removeNode = useCallback((id: string) => {
    setNodes((current) => current.filter((node) => node.id !== id));
    setEdges((current) => current.filter((edge) => edge.source !== id && edge.target !== id));
    setSelectedId((current) => (current === id ? null : current));
    setDirty(true);
  }, []);

  const markSaved = useCallback(() => setDirty(false), []);

  const selected = useMemo(() => nodes.find((node) => node.id === selectedId) ?? null, [nodes, selectedId]);

  return {
    nodes,
    edges,
    selected,
    selectedId,
    dirty,
    load,
    applyIssues,
    onNodesChange,
    onEdgesChange,
    onConnect,
    connect,
    disconnect,
    addNode,
    updateConfig,
    removeNode,
    select: setSelectedId,
    markSaved,
  };
}

export type FlowGraph = ReturnType<typeof useFlowGraph>;
