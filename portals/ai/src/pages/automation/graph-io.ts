import type { Edge, Node } from '@xyflow/react';
import { isNodeKind, type NodeKind } from './node-kinds';
import type { FlowEdgeDto, FlowNodeDto, NodeData } from './types';

/**
 * Between the API's graph (positions + JSON data) and React Flow's nodes and
 * edges. The canvas node's `data` wraps the step's own settings under `config`
 * so the card can also carry what is not persisted — its issues.
 */

export interface CanvasNodeData extends Record<string, unknown> {
  kind: NodeKind;
  config: NodeData;
  /** What the server said is wrong with this step, from the last save or test. */
  issues: string[];
}

export type CanvasNode = Node<CanvasNodeData, 'step'>;

const parse = (json: string): NodeData => {
  try {
    const value = JSON.parse(json);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
};

export function toCanvasNodes(nodes: readonly FlowNodeDto[]): CanvasNode[] {
  return nodes
    .filter((node) => isNodeKind(node.kind))
    .map((node) => ({
      id: node.id,
      type: 'step' as const,
      position: { x: node.x, y: node.y },
      deletable: node.kind !== 'trigger',
      data: { kind: node.kind as NodeKind, config: parse(node.data), issues: [] },
    }));
}

export function toCanvasEdges(edges: readonly FlowEdgeDto[]): Edge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    sourceHandle: edge.source_handle,
    target: edge.target,
  }));
}

export interface NodeInput {
  id: string;
  kind: string;
  x: number;
  y: number;
  data: string;
}

export interface EdgeInput {
  id: string;
  source: string;
  source_handle: string;
  target: string;
}

export const toNodeInputs = (nodes: readonly CanvasNode[]): NodeInput[] =>
  nodes.map((node) => ({
    id: node.id,
    kind: node.data.kind,
    x: Math.round(node.position.x),
    y: Math.round(node.position.y),
    data: JSON.stringify(node.data.config),
  }));

export const toEdgeInputs = (edges: readonly Edge[]): EdgeInput[] =>
  edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    source_handle: edge.sourceHandle ?? 'next',
    target: edge.target,
  }));

/** The exits a step offers — the mirror of the server's `exitsOf`. */
export function exitsOf(kind: NodeKind, config: NodeData): string[] {
  if (kind === 'condition') return ['yes', 'no'];
  if (kind === 'wait_for_reply') return ['reply', 'timeout'];
  if (kind === 'ai_classify') {
    const labels = Array.isArray(config.labels) ? config.labels.filter(Boolean) : [];
    return [...labels.map((_label, index) => `label:${index}`), 'other'];
  }
  return ['next'];
}

/** The label of a classify exit — the label text itself; other handles resolve through their keys. */
export function classifyLabelOf(config: NodeData, handle: string): string | null {
  if (!handle.startsWith('label:')) return null;
  const labels = Array.isArray(config.labels) ? config.labels : [];
  const index = Number(handle.slice('label:'.length));
  return String(labels[index] ?? '');
}

export const newId = (prefix: string): string =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/** Where a step added from the palette lands: under the lowest step, in the trigger's column. */
export function nextPosition(nodes: readonly CanvasNode[]): { x: number; y: number } {
  if (!nodes.length) return { x: 80, y: 80 };
  const trigger = nodes.find((node) => node.data.kind === 'trigger') ?? nodes[0];
  const lowest = Math.max(...nodes.map((node) => node.position.y));
  return { x: trigger.position.x, y: lowest + 150 };
}
