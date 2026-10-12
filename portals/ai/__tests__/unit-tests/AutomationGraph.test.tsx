import { describe, expect, it } from 'vitest';
import { act, fireEvent, renderHook, screen, waitFor } from '@testing-library/react';
import { Route } from 'react-router';
import { vi } from 'vitest';
import AutomationBuilderPage from '../../src/pages/automation/builder';
import { useFlowGraph } from '../../src/pages/automation/builder/useFlowGraph';
import { AUTOMATION_FLOW, AUTOMATION_OPTIONS } from '../../src/pages/automation/queries';
import { DRAG_KIND } from '../../src/pages/automation/builder/FlowCanvas';
import { renderWithProviders } from '../testkit';
import { answerQuery, resetApollo } from './reel-apollo-mock';
import { OPTIONS, en, flow } from './automation-fixtures';

vi.mock('@apollo/client/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client/react')>()),
  ...(await import('./reel-apollo-mock')).hooks,
}));

const BRANCHING = flow({
  nodes: [
    { id: 'trigger', kind: 'trigger', x: 0, y: 0, data: '{"trigger":"INBOUND_MESSAGE"}' },
    { id: 'c1', kind: 'condition', x: 0, y: 150, data: '{"variable":"message.text","operator":"contains","value":"yes"}' },
    { id: 'k1', kind: 'ai_classify', x: 300, y: 150, data: '{"instructions":"Sort","labels":["Sales","Help"]}' },
    { id: 'd1', kind: 'delay', x: 0, y: 300, data: '{"amount":1,"unit":"DAYS"}' },
  ],
  edges: [
    { id: 'e1', source: 'trigger', source_handle: 'next', target: 'c1' },
    { id: 'e2', source: 'c1', source_handle: 'yes', target: 'd1' },
    { id: 'e3', source: 'k1', source_handle: 'label:1', target: 'd1' },
  ],
});

describe('useFlowGraph', () => {
  const loaded = () => {
    const hook = renderHook(() => useFlowGraph('WHATSAPP'));
    act(() => hook.result.current.load(BRANCHING));
    return hook;
  };

  it('loads a flow clean and carries each step issues', () => {
    const hook = renderHook(() => useFlowGraph('WHATSAPP'));
    act(() => hook.result.current.load({ ...BRANCHING, issues: [{ node_id: 'd1', message: 'No amount' }] }));
    expect(hook.result.current.nodes.map((n) => n.id)).toEqual(['trigger', 'c1', 'k1', 'd1']);
    expect(hook.result.current.nodes.find((n) => n.id === 'd1')?.data.issues).toEqual(['No amount']);
    expect(hook.result.current.dirty).toBe(false);
  });

  it('re-points an exit that already leads somewhere instead of doubling it', () => {
    const hook = loaded();
    act(() => hook.result.current.connect('c1', 'yes', 'k1'));
    const fromYes = hook.result.current.edges.filter((e) => e.source === 'c1' && e.sourceHandle === 'yes');
    expect(fromYes.map((e) => e.target)).toEqual(['k1']);
    expect(hook.result.current.dirty).toBe(true);
  });

  it('ignores a connection from a step to itself and a drag with no target', () => {
    const hook = loaded();
    act(() => hook.result.current.connect('c1', 'no', 'c1'));
    act(() => hook.result.current.onConnect({ source: 'c1', sourceHandle: 'no', target: '' }));
    expect(hook.result.current.edges).toHaveLength(3);
    expect(hook.result.current.dirty).toBe(false);
    act(() => hook.result.current.onConnect({ source: 'c1', sourceHandle: null, target: 'd1' }));
    expect(hook.result.current.edges.some((e) => e.source === 'c1' && e.sourceHandle === 'next' && e.target === 'd1')).toBe(true);
  });

  it('drops the arrows of a removed classify label and of a removed step', () => {
    const hook = loaded();
    act(() => hook.result.current.updateConfig('k1', { labels: ['Sales'] }));
    expect(hook.result.current.edges.find((e) => e.id === 'e3')).toBeUndefined();
    act(() => hook.result.current.removeNode('d1'));
    expect(hook.result.current.edges.map((e) => e.id)).toEqual(['e1']);
    expect(hook.result.current.nodes.some((n) => n.id === 'd1')).toBe(false);
  });

  it('keeps selection on another step when one is removed, and clears it for the removed one', () => {
    const hook = loaded();
    act(() => hook.result.current.select('c1'));
    act(() => hook.result.current.removeNode('k1'));
    expect(hook.result.current.selectedId).toBe('c1');
    act(() => hook.result.current.removeNode('c1'));
    expect(hook.result.current.selected).toBeNull();
  });

  it('disconnects one exit, and flags only moves and removals as edits', () => {
    const hook = loaded();
    act(() => hook.result.current.onNodesChange([{ id: 'd1', type: 'select', selected: true }]));
    act(() => hook.result.current.onEdgesChange([{ id: 'e1', type: 'select', selected: true }]));
    expect(hook.result.current.dirty).toBe(false);
    act(() => hook.result.current.onNodesChange([{ id: 'd1', type: 'position', position: { x: 5, y: 6 } }]));
    expect(hook.result.current.dirty).toBe(true);
    act(() => hook.result.current.markSaved());
    act(() => hook.result.current.onEdgesChange([{ id: 'e1', type: 'remove' }]));
    expect(hook.result.current.dirty).toBe(true);
    expect(hook.result.current.edges.find((e) => e.id === 'e1')).toBeUndefined();
    act(() => hook.result.current.disconnect('c1', 'yes'));
    expect(hook.result.current.edges.map((e) => e.id)).toEqual(['e3']);
  });
});

describe('Builder canvas with branching steps', () => {
  const mount = () => {
    resetApollo();
    answerQuery(AUTOMATION_FLOW, { data: { automationFlow: BRANCHING } });
    answerQuery(AUTOMATION_OPTIONS, { data: { automationOptions: OPTIONS } });
    return renderWithProviders(<AutomationBuilderPage />, {
      initialEntries: ['/automation/whatsapp/F1'],
      routes: <Route path="/automation/:channel/:flowId" element={<AutomationBuilderPage />} />,
    });
  };

  it('labels every exit of a branching step on the card', async () => {
    mount();
    const condition = await screen.findByTestId('automation-node-condition');
    expect(condition).toHaveTextContent(en('ai.automation.handles.yes'));
    expect(condition).toHaveTextContent(en('ai.automation.handles.no'));
    const classify = screen.getByTestId('automation-node-ai_classify');
    expect(classify).toHaveTextContent('Sales');
    expect(classify).toHaveTextContent('Help');
    expect(classify).toHaveTextContent(en('ai.automation.handles.other'));
  });

  it('adds a step dropped from the palette, ignoring an unknown payload', async () => {
    mount();
    const canvas = await screen.findByTestId('automation-canvas');
    const pane = canvas.querySelector('.react-flow') as HTMLElement;
    const drop = (kind: string) =>
      fireEvent.drop(pane, { clientX: 400, clientY: 300, dataTransfer: { getData: (type: string) => (type === DRAG_KIND ? kind : '') } });
    drop('not_a_kind');
    expect(screen.queryByTestId('automation-node-http_request')).not.toBeInTheDocument();
    drop('http_request');
    expect(await screen.findByTestId('automation-node-http_request')).toBeInTheDocument();
    fireEvent.dragOver(pane, { dataTransfer: { dropEffect: '' } });
  });

  it('selects the focused step with Enter, so the keyboard reaches the inspector', async () => {
    mount();
    const card = await screen.findByTestId('automation-node-delay');
    const wrapper = card.closest('.react-flow__node') as HTMLElement;
    fireEvent.keyDown(wrapper, { key: 'a' });
    expect(screen.queryByTestId('automation-inspector')).not.toBeInTheDocument();
    fireEvent.keyDown(wrapper, { key: 'Enter' });
    await waitFor(() => expect(screen.getByTestId('automation-inspector')).toBeInTheDocument());
    expect(screen.getByLabelText(en('ai.automation.inspector.delay.amount'))).toHaveValue(1);
  });
});
