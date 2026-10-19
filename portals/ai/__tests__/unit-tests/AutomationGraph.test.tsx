import { describe, expect, it } from 'vitest';
import { act, fireEvent, renderHook, screen, waitFor } from '@testing-library/react';
import { Route } from 'react-router';
import { vi } from 'vitest';
import AutomationBuilderPage from '../../src/pages/automation/builder';
import { useFlowGraph } from '../../src/pages/automation/builder/useFlowGraph';
import { AUTOMATION_FLOW, AUTOMATION_OPTIONS } from '../../src/pages/automation/queries';
import { DRAG_KIND } from '../../src/pages/automation/builder/FlowCanvas';
import type { AutomationFlow } from '../../src/pages/automation/types';
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

describe('useFlowGraph — arrows React Flow drew without an exit name', () => {
  /** An arrow added straight from the canvas: React Flow leaves `sourceHandle` unset for a card's only exit. */
  const withBareArrow = () => {
    const hook = renderHook(() => useFlowGraph('WHATSAPP'));
    act(() => hook.result.current.load(BRANCHING));
    act(() => hook.result.current.onEdgesChange([{ type: 'add', item: { id: 'bare', source: 'd1', target: 'k1' } }]));
    return hook;
  };

  it('treats a bare arrow as the "next" exit when that exit is re-pointed', () => {
    const hook = withBareArrow();
    act(() => hook.result.current.connect('d1', 'next', 'c1'));
    const fromDelay = hook.result.current.edges.filter((edge) => edge.source === 'd1');
    expect(fromDelay.map((edge) => edge.target)).toEqual(['c1']);
  });

  it('treats a bare arrow as the "next" exit when that exit is disconnected', () => {
    const hook = withBareArrow();
    act(() => hook.result.current.disconnect('d1', 'next'));
    expect(hook.result.current.edges.some((edge) => edge.source === 'd1')).toBe(false);
    expect(hook.result.current.dirty).toBe(true);
  });

  it('keeps a bare arrow when the step still has a "next" exit after its settings change', () => {
    const hook = withBareArrow();
    act(() => hook.result.current.updateConfig('d1', { amount: 5, unit: 'DAYS' }));
    expect(hook.result.current.edges.map((edge) => edge.id)).toContain('bare');
    expect(hook.result.current.nodes.find((n) => n.id === 'd1')?.data.config).toEqual({ amount: 5, unit: 'DAYS' });
  });

  it('leaves every arrow alone when the step being changed is no longer on the canvas', () => {
    const hook = withBareArrow();
    const before = hook.result.current.edges;
    act(() => hook.result.current.updateConfig('gone', { labels: [] }));
    expect(hook.result.current.edges).toBe(before);
  });
});

describe('Builder canvas — pointer and keyboard', () => {
  const mount = (over: Parameters<typeof flow>[0] = BRANCHING) => {
    resetApollo();
    answerQuery(AUTOMATION_FLOW, { data: { automationFlow: flow(over) } });
    answerQuery(AUTOMATION_OPTIONS, { data: { automationOptions: OPTIONS } });
    return renderWithProviders(<AutomationBuilderPage />, {
      initialEntries: ['/automation/whatsapp/F1'],
      routes: <Route path="/automation/:channel/:flowId" element={<AutomationBuilderPage />} />,
    });
  };

  it('closes the inspector when the empty canvas is clicked', async () => {
    mount();
    fireEvent.click(await screen.findByTestId('automation-node-delay'));
    expect(await screen.findByTestId('automation-inspector')).toBeInTheDocument();
    fireEvent.click(document.querySelector('.react-flow__pane') as HTMLElement);
    await waitFor(() => expect(screen.queryByTestId('automation-inspector')).not.toBeInTheDocument());
    expect(screen.getByTestId('automation-node-delay')).toBeInTheDocument();
  });

  it('deletes the selected step with the Delete key and closes its inspector', async () => {
    mount();
    fireEvent.click(await screen.findByTestId('automation-node-delay'));
    expect(await screen.findByTestId('automation-inspector')).toBeInTheDocument();
    fireEvent.keyDown(document.body, { key: 'Delete', code: 'Delete' });
    fireEvent.keyUp(document.body, { key: 'Delete', code: 'Delete' });
    await waitFor(() => expect(screen.queryByTestId('automation-node-delay')).not.toBeInTheDocument());
    expect(screen.queryByTestId('automation-inspector')).not.toBeInTheDocument();
    expect(screen.getByText(en('ai.automation.builder.unsaved'))).toBeInTheDocument();
  });

  it('places a step dragged from the palette where it is dropped', async () => {
    mount();
    const carried: Record<string, string> = {};
    const dataTransfer = {
      effectAllowed: '',
      setData: (format: string, value: string) => {
        carried[format] = value;
      },
      getData: (format: string) => carried[format] ?? '',
    };
    fireEvent.dragStart(await screen.findByTestId('automation-palette-set_variable'), { dataTransfer });
    expect(carried[DRAG_KIND]).toBe('set_variable');
    expect(dataTransfer.effectAllowed).toBe('move');

    fireEvent.drop(document.querySelector('.react-flow') as HTMLElement, { clientX: 300, clientY: 200, dataTransfer });
    expect(await screen.findByTestId('automation-node-set_variable')).toBeInTheDocument();
  });

  it('tints the minimap mask for the colour mode in use', async () => {
    const mask = () => screen.getByTestId('rf__minimap').style.getPropertyValue('--xy-minimap-mask-background-color-props');
    const dark = mount();
    await screen.findByTestId('automation-canvas');
    expect(mask()).toBe('rgba(8, 12, 20, 0.72)');
    dark.unmount();

    localStorage.setItem('duncit_color_mode', 'light');
    mount();
    await screen.findByTestId('automation-canvas');
    expect(mask()).toBe('rgba(226, 232, 240, 0.72)');
  });

  it('still draws the flow when an arrow leaves a step this portal cannot show, or names no exit', async () => {
    mount({
      nodes: [
        ...BRANCHING.nodes,
        // A kind from a newer server: the card is dropped, its arrow stays in the data.
        { id: 'x1', kind: 'send_sms', x: 0, y: 450, data: '{}' },
      ],
      edges: [
        ...BRANCHING.edges,
        { id: 'e4', source: 'x1', source_handle: 'next', target: 'd1' },
        { id: 'e5', source: 'c1', target: 'k1' } as AutomationFlow['edges'][number],
      ],
    });
    expect(await screen.findByTestId('automation-node-condition')).toBeInTheDocument();
    expect(screen.getByTestId('automation-node-delay')).toBeInTheDocument();
    expect(screen.getAllByTestId(/^automation-node-/)).toHaveLength(4);
  });
});
