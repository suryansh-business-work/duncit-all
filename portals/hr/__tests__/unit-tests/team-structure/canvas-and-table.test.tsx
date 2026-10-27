import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useEffect, useState } from 'react';
import SeatCanvas from '../../../src/pages/team-structure/SeatCanvas';
import TeamsTable from '../../../src/pages/team-structure/TeamsTable';
import { seat } from './support';

vi.mock('@duncit/app-settings', async (io) => (await import('./support')).withKeys(await io<typeof import('@duncit/app-settings')>()));

const flow = vi.hoisted(() => ({ props: null as unknown as Record<string, any>, minimapColor: [] as string[] }));

// React Flow measures real layout, which jsdom cannot; this stand-in renders the
// seat component for every node it is given and exposes the handlers the canvas
// wires, so what the canvas passes to React Flow is what is asserted.
vi.mock('@xyflow/react', () => ({
  ReactFlowProvider: ({ children }: any) => <>{children}</>,
  Background: () => null,
  Controls: () => null,
  Handle: () => null,
  Position: { Top: 'top', Bottom: 'bottom' },
  MiniMap: ({ nodeColor, bgColor }: any) => {
    flow.minimapColor = flow.props.nodes.map((n: any) => nodeColor(n));
    return <i data-testid="minimap" data-bg={bgColor} />;
  },
  ReactFlow: (props: any) => {
    flow.props = props;
    const Seat = props.nodeTypes.seat;
    return (
      <div data-testid="flow">
        {props.nodes.map((n: any) => (
          <div key={n.id} data-testid={`node-${n.id}`} data-selected={String(n.selected)} data-x={n.position.x} data-y={n.position.y} data-connectable={String(n.connectable)}>
            <Seat data={n.data} selected={n.selected} />
            <button onClick={() => props.onNodeClick({}, n)}>click-{n.id}</button>
          </div>
        ))}
        <button onClick={() => props.onPaneClick()}>pane</button>
        <button onClick={() => props.onConnect({ source: 'root', target: 'child' })}>connect</button>
        <button onClick={() => props.onConnect({ source: 'root', target: 'root' })}>connect-self</button>
        <button onClick={() => props.onConnect({ source: null, target: 'child' })}>connect-open</button>
        <button onClick={() => props.onConnect({ source: 'root', target: null })}>connect-nowhere</button>
        {props.children}
      </div>
    );
  },
}));

const chart = [seat('root', { kind: 'HEAD' }), seat('child', { kind: 'AI_AGENT', parent_id: 'root' })];

describe('SeatCanvas', () => {
  const mount = (over: Partial<Parameters<typeof SeatCanvas>[0]> = {}) => {
    const handlers = { onSelect: vi.fn(), onAddChild: vi.fn(), onReparent: vi.fn() };
    render(<SeatCanvas nodes={chart} currency="INR" selectedId={null} {...handlers} {...over} />);
    return handlers;
  };

  it('draws every seat at its laid-out place and joins each to its parent with an edge', () => {
    mount();
    expect(screen.getAllByTestId(/^node-/)).toHaveLength(2);
    expect(flow.props.edges).toEqual([expect.objectContaining({ id: 'root-child', source: 'root', target: 'child', type: 'smoothstep' })]);
    expect(Number(screen.getByTestId('node-child').dataset.y)).toBeGreaterThan(Number(screen.getByTestId('node-root').dataset.y));
    expect(flow.props.nodesDraggable).toBe(false);
  });

  it('draws no edge for a seat whose parent is not on the chart', () => {
    mount({ nodes: [{ ...chart[1], parent_id: 'ghost' }] });
    expect(flow.props.edges).toEqual([]);
  });

  it('marks the selected seat', () => {
    mount({ selectedId: 'child' });
    expect(screen.getByTestId('node-child').dataset.selected).toBe('true');
    expect(screen.getByTestId('node-root').dataset.selected).toBe('false');
  });

  it('reports a clicked seat and a click on the empty canvas', () => {
    const { onSelect } = mount();
    fireEvent.click(screen.getByText('click-child'));
    expect(onSelect).toHaveBeenLastCalledWith('child');
    fireEvent.click(screen.getByText('pane'));
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });

  it('re-parents the dragged-to seat under the one it was dragged from', () => {
    const { onReparent } = mount();
    fireEvent.click(screen.getByText('connect'));
    expect(onReparent).toHaveBeenCalledWith('child', 'root');
  });

  it('ignores a connection to itself and one with a loose end', () => {
    const { onReparent } = mount();
    for (const name of ['connect-self', 'connect-open', 'connect-nowhere']) fireEvent.click(screen.getByText(name));
    expect(onReparent).not.toHaveBeenCalled();
  });

  it('lets a seat add a child through the card’s + button', () => {
    const { onAddChild } = mount();
    fireEvent.click(screen.getAllByRole('button', { name: /addUnder/ })[0]);
    expect(onAddChild).toHaveBeenCalledWith('root');
    expect(screen.getByTestId('node-root').dataset.connectable).toBe('true');
  });

  it('is read-only without handlers: nothing connects, no + buttons, a connect does nothing', () => {
    render(<SeatCanvas nodes={chart} currency="INR" selectedId={null} onSelect={() => undefined} />);
    expect(flow.props.nodesConnectable).toBe(false);
    expect(screen.queryByRole('button', { name: /addUnder/ })).not.toBeInTheDocument();
    expect(screen.getByTestId('node-root').dataset.connectable).toBe('false');
    fireEvent.click(screen.getByText('connect'));
  });

  it('colours the minimap by seat kind', () => {
    mount();
    expect(flow.minimapColor).toHaveLength(2);
    expect(flow.minimapColor[0]).not.toBe(flow.minimapColor[1]);
    expect(screen.getByTestId('minimap').dataset.bg).toBeTruthy();
  });
});

// --- TeamsTable -----------------------------------------------------------

const table = vi.hoisted(() => ({ props: null as unknown as Record<string, any> }));

vi.mock('@duncit/table', async (io) => ({
  ...(await io<typeof import('@duncit/table')>()),
  // AG Grid needs real layout; this renders each row through the columns' own renderers.
  DuncitTable: (props: any) => {
    table.props = props;
    const [rows, setRows] = useState<any[]>([]);
    useEffect(() => {
      props.fetchRows({ search: '', page: 1, pageSize: 50, sortBy: null, sortDir: 'asc', filters: [] }).then((p: any) => setRows(p.rows));
    }, [props]);
    return (
      <div role="table" aria-label={props.ariaLabel}>
        {rows.map((row) => (
          <div key={props.getRowId(row)} data-testid={`row-${row.id}`} onClick={() => props.onRowClick(row)}>
            {props.columns.map((c: any) => (
              <span key={c.field} data-field={c.field}>
                {c.cellRenderer ? c.cellRenderer(row) : String(c.valueGetter?.(row) ?? '')}
              </span>
            ))}
          </div>
        ))}
      </div>
    );
  },
}));

describe('TeamsTable', () => {
  const rows = [
    { id: 't1', name: 'Core', description: 'The core team', currency: 'INR', seat_count: 4, monthly_cost: 52000, updated_at: '2026-10-20T10:00:00Z' },
    { id: 't2', name: 'Overseas', description: null, currency: 'USD', seat_count: null, monthly_cost: null, updated_at: null },
  ];
  const mount = () => {
    const handlers = { onOpen: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn() };
    render(<TeamsTable rows={rows} {...handlers} />);
    return handlers;
  };

  it('lists every team with its name, description, seats and monthly budget in its own currency', async () => {
    mount();
    const core = await screen.findByTestId('row-t1');
    expect(core).toHaveTextContent('Core');
    expect(core).toHaveTextContent('The core team');
    expect(core.querySelector('[data-field="seat_count"]')).toHaveTextContent('4');
    expect(core.querySelector('[data-field="monthly_cost"]')).toHaveTextContent(/₹.*52,?000/);
    const overseas = screen.getByTestId('row-t2');
    expect(overseas.querySelector('[data-field="monthly_cost"]')).toHaveTextContent(/\$.*0/);
    expect(overseas.querySelector('[data-field="seat_count"]')).toHaveTextContent('0');
    expect(overseas).not.toHaveTextContent('The core team');
  });

  it('opens a team when its row is clicked', async () => {
    const { onOpen } = mount();
    fireEvent.click(await screen.findByTestId('row-t2'));
    expect(onOpen).toHaveBeenCalledWith(rows[1]);
  });

  it('renames and deletes through the row actions', async () => {
    const { onEdit, onDelete } = mount();
    const core = await screen.findByTestId('row-t1');
    fireEvent.click(core.querySelector('[data-testid="row-action-edit"]') as Element);
    expect(onEdit).toHaveBeenCalledWith(rows[0]);
    fireEvent.click(core.querySelector('[data-testid="row-action-delete"]') as Element);
    expect(onDelete).toHaveBeenCalledWith(rows[0]);
  });

  it('is labelled, sorted newest-first, and searches name and description', async () => {
    mount();
    await waitFor(() => expect(table.props.ariaLabel).toBe('hr.teamStructure.list.title'));
    expect(table.props.tableId).toBe('hr-team-structures');
    expect(table.props.defaultSort).toEqual({ field: 'updated_at', dir: 'desc' });
    expect(table.props.emptyText).toBe('hr.teamStructure.list.empty');
    const found = await table.props.fetchRows({ search: 'overseas', page: 1, pageSize: 50, sortBy: null, sortDir: 'asc', filters: [] });
    expect(found.rows.map((r: { id: string }) => r.id)).toEqual(['t2']);
    const byDescription = await table.props.fetchRows({ search: 'core team', page: 1, pageSize: 50, sortBy: null, sortDir: 'asc', filters: [] });
    expect(byDescription.rows.map((r: { id: string }) => r.id)).toEqual(['t1']);
  });
});
