import type { Edge } from '@xyflow/react';
import type { CanvasNode } from '../graph-io';
import type { AutomationChannel, AutomationOptions, FlowIssue, NodeData } from '../types';
import type { SidePanelKind } from './BuilderToolbar';
import NodeInspector from './inspector/NodeInspector';
import TestChatPanel from '../test-chat/TestChatPanel';
import RunsPanel from '../runs/RunsPanel';

interface Props {
  panel: SidePanelKind;
  flowId: string;
  channel: AutomationChannel;
  options: AutomationOptions;
  selected: CanvasNode | null;
  nodes: readonly CanvasNode[];
  edges: readonly Edge[];
  onChange: (id: string, config: NodeData) => void;
  onRemove: (id: string) => void;
  onConnect: (source: string, handle: string, target: string) => void;
  onDisconnect: (source: string, handle: string) => void;
  onIssues: (issues: FlowIssue[]) => void;
  onClosePanel: () => void;
}

/** The right column: the step inspector, the test chat, or the run history — one at a time. */
export default function SidePanel(props: Readonly<Props>) {
  const { panel, flowId, channel, options, selected, nodes, edges, onChange, onRemove, onConnect, onDisconnect, onIssues, onClosePanel } = props;
  if (panel === 'test') {
    return <TestChatPanel flowId={flowId} channel={channel} nodes={nodes} edges={edges} onIssues={onIssues} onClose={onClosePanel} />;
  }
  if (panel === 'runs') {
    return <RunsPanel flowId={flowId} onClose={onClosePanel} />;
  }
  return (
    <NodeInspector
      node={selected}
      nodes={nodes}
      edges={edges}
      channel={channel}
      options={options}
      onChange={onChange}
      onRemove={onRemove}
      onConnect={onConnect}
      onDisconnect={onDisconnect}
    />
  );
}
