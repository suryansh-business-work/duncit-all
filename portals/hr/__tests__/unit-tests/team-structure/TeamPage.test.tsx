import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { Route, useLocation } from 'react-router';
import TeamPage from '../../../src/pages/team-structure/TeamPage';
import PublicTeamPage from '../../../src/pages/team-structure/PublicTeamPage';
import { renderWithProviders } from '../../testkit';
import { seat, structure } from './support';

vi.mock('@duncit/app-settings', async (io) => (await import('./support')).withKeys(await io<typeof import('@duncit/app-settings')>()));

const page = vi.hoisted(() => ({
  team: null as any,
  confirm: vi.fn(),
  canvas: null as unknown as Record<string, any>,
  drawer: null as unknown as Record<string, any>,
  share: null as unknown as Record<string, any>,
  publicQuery: { data: undefined as any, loading: false, error: undefined as any },
}));

vi.mock('../../../src/pages/team-structure/useTeamStructure', () => ({ useTeamStructure: () => page.team }));
vi.mock('@duncit/dialogs', () => ({ useConfirm: () => page.confirm }));
vi.mock('@apollo/client/react', () => ({ useQuery: () => page.publicQuery }));
vi.mock('../../../src/pages/team-structure/SeatCanvas', () => ({
  default: (props: any) => {
    page.canvas = props;
    return <div data-testid="canvas" data-selected={String(props.selectedId)} data-nodes={props.nodes.length} />;
  },
}));
vi.mock('../../../src/pages/team-structure/SeatDrawer', () => ({
  default: (props: any) => {
    page.drawer = props;
    return <div data-testid="drawer" data-open={String(props.open)} />;
  },
}));
vi.mock('../../../src/pages/team-structure/ShareDialog', () => ({
  default: (props: any) => {
    page.share = props;
    return props.open ? <div data-testid="share-dialog" /> : null;
  },
}));

const nodes = [seat('a'), seat('b', { parent_id: 'a', pay: null }), seat('c')];

const makeTeam = (over: Record<string, unknown> = {}) => ({
  structure,
  nodes,
  loading: false,
  error: undefined,
  busy: false,
  canUndo: true,
  canRedo: true,
  saveSeat: vi.fn().mockResolvedValue(undefined),
  removeSeat: vi.fn().mockResolvedValue(undefined),
  undo: vi.fn(),
  redo: vi.fn(),
  ...over,
});

const Where = () => <div data-testid="where">{useLocation().pathname}</div>;
const mount = () =>
  renderWithProviders(<TeamPage />, {
    initialEntries: ['/team-structure/s1'],
    routes: (
      <>
        <Route path="/team-structure/:id" element={<TeamPage />} />
        <Route path="/team-structure" element={<Where />} />
      </>
    ),
  });
const act$ = (fn: () => unknown) => act(async () => { await fn(); });

beforeEach(() => {
  page.team = makeTeam();
  page.confirm.mockReset().mockResolvedValue(true);
});

describe('loading the chart', () => {
  it('shows a spinner while loading', () => {
    page.team = makeTeam({ loading: true, structure: undefined });
    mount();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows an error when the chart cannot be loaded, or the team is missing', () => {
    page.team = makeTeam({ error: new Error('x') });
    const { unmount } = mount();
    expect(screen.getByText('hr.teamStructure.loadFailed')).toBeInTheDocument();
    unmount();
    page.team = makeTeam({ structure: undefined });
    mount();
    expect(screen.getByText('hr.teamStructure.loadFailed')).toBeInTheDocument();
  });

  it('shows the team’s name, its description, the canvas, and the budget', () => {
    mount();
    expect(screen.getByText('Core Team')).toBeInTheDocument();
    expect(screen.getByText('The core')).toBeInTheDocument();
    expect(screen.getByTestId('canvas')).toHaveAttribute('data-nodes', '3');
    expect(screen.getByText(/hr\.teamStructure\.cost\.total/)).toBeInTheDocument();
    expect(screen.queryByText('hr.teamStructure.emptyChart')).not.toBeInTheDocument();
  });

  it('invites the first seat on an empty chart', () => {
    page.team = makeTeam({ nodes: [] });
    mount();
    expect(screen.getByText('hr.teamStructure.emptyChart')).toBeInTheDocument();
  });

  it('works for a team with no description', () => {
    page.team = makeTeam({ structure: { ...structure, description: null } });
    mount();
    expect(screen.queryByText('The core')).not.toBeInTheDocument();
  });
});

describe('the toolbar', () => {
  it('goes back to the list of teams', async () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: /hr\.teamStructure\.back/ }));
    expect(await screen.findByTestId('where')).toHaveTextContent('/team-structure');
  });

  it('undoes and redoes', () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'hr.teamStructure.undo' }));
    fireEvent.click(screen.getByRole('button', { name: 'hr.teamStructure.redo' }));
    expect(page.team.undo).toHaveBeenCalledTimes(1);
    expect(page.team.redo).toHaveBeenCalledTimes(1);
  });

  it('disables undo and redo when there is nothing to do, or while a write is running', () => {
    page.team = makeTeam({ canUndo: false, canRedo: false });
    const { unmount } = mount();
    expect(screen.getByRole('button', { name: 'hr.teamStructure.undo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'hr.teamStructure.redo' })).toBeDisabled();
    unmount();
    page.team = makeTeam({ busy: true });
    mount();
    expect(screen.getByRole('button', { name: 'hr.teamStructure.undo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'hr.teamStructure.redo' })).toBeDisabled();
  });

  it('opens the drawer for a new top-level seat, placed after the existing top seats', () => {
    mount();
    expect(page.drawer.open).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'hr.teamStructure.addSeat' }));
    expect(page.drawer).toMatchObject({ open: true, node: null, parentId: null, nextOrder: 2, currency: 'INR', busy: false });
  });

  it('opens and closes the share dialog', () => {
    mount();
    expect(screen.queryByTestId('share-dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'hr.teamStructure.share.button' }));
    expect(screen.getByTestId('share-dialog')).toBeInTheDocument();
    expect(page.share.structureId).toBe('s1');
    act(() => page.share.onClose());
    expect(screen.queryByTestId('share-dialog')).not.toBeInTheDocument();
  });
});

describe('working on the canvas', () => {
  it('opens the drawer on a seat when it is selected, and closes it when the canvas is clicked', () => {
    mount();
    act(() => page.canvas.onSelect('b'));
    expect(page.drawer.open).toBe(true);
    expect(page.drawer.node.id).toBe('b');
    expect(screen.getByTestId('canvas')).toHaveAttribute('data-selected', 'b');
    act(() => page.canvas.onSelect(null));
    expect(page.drawer.open).toBe(false);
    expect(screen.getByTestId('canvas')).toHaveAttribute('data-selected', 'null');
  });

  it('adds a seat under the one whose + was pressed, after its existing children', () => {
    mount();
    act(() => page.canvas.onAddChild('a'));
    expect(page.drawer).toMatchObject({ open: true, node: null, parentId: 'a', nextOrder: 1 });
  });

  it('switches from adding to editing when a seat is selected, and the other way round', () => {
    mount();
    act(() => page.canvas.onAddChild('a'));
    act(() => page.canvas.onSelect('c'));
    expect(page.drawer).toMatchObject({ node: expect.objectContaining({ id: 'c' }), parentId: null });
    act(() => page.canvas.onAddChild('c'));
    expect(page.drawer).toMatchObject({ node: null, parentId: 'c' });
  });

  it('saves a seat and then closes the drawer', async () => {
    mount();
    act(() => page.canvas.onSelect('a'));
    const draft = { id: 'a', title: 'x' };
    await act$(() => page.drawer.onSave(draft));
    expect(page.team.saveSeat).toHaveBeenCalledWith(draft);
    expect(page.drawer.open).toBe(false);
  });

  it('closes the drawer from its own cancel', () => {
    mount();
    act(() => page.canvas.onSelect('a'));
    act(() => page.drawer.onClose());
    expect(page.drawer.open).toBe(false);
  });

  it('deletes a seat only after the user confirms, then closes the drawer', async () => {
    mount();
    act(() => page.canvas.onSelect('a'));
    await act$(() => page.drawer.onDelete(nodes[0]));
    expect(page.confirm).toHaveBeenCalledWith(expect.objectContaining({ destructive: true, title: 'hr.teamStructure.seat.deleteTitle|{"title":"Seat a"}' }));
    expect(page.team.removeSeat).toHaveBeenCalledWith('a');
    expect(page.drawer.open).toBe(false);
  });

  it('keeps the seat and the drawer when the user backs out of deleting', async () => {
    page.confirm.mockResolvedValue(false);
    mount();
    act(() => page.canvas.onSelect('a'));
    await act$(() => page.drawer.onDelete(nodes[0]));
    expect(page.team.removeSeat).not.toHaveBeenCalled();
    expect(page.drawer.open).toBe(true);
  });

  it('re-parents a seat under another, placed after that seat’s children, keeping its pay', async () => {
    mount();
    act(() => page.canvas.onReparent('c', 'a'));
    expect(page.team.saveSeat).toHaveBeenCalledWith(expect.objectContaining({ id: 'c', parent_id: 'a', sort_order: 1, pay: [] }));
  });

  it('treats a seat whose pay is hidden as having none when re-parenting it', () => {
    mount();
    act(() => page.canvas.onReparent('b', 'c'));
    expect(page.team.saveSeat).toHaveBeenCalledWith(expect.objectContaining({ id: 'b', parent_id: 'c', pay: [] }));
  });

  it('does nothing when a seat is dropped on the parent it already has, or does not exist', () => {
    mount();
    act(() => page.canvas.onReparent('b', 'a'));
    act(() => page.canvas.onReparent('ghost', 'a'));
    expect(page.team.saveSeat).not.toHaveBeenCalled();
  });
});

describe('keyboard shortcuts', () => {
  const press = (init: KeyboardEventInit, target: EventTarget = window) => {
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
    act(() => {
      target.dispatchEvent(event);
    });
    return event;
  };

  it('Ctrl+Z undoes, and Ctrl+Shift+Z, Ctrl+Y and Cmd+Y redo', () => {
    mount();
    expect(press({ key: 'z', ctrlKey: true }).defaultPrevented).toBe(true);
    expect(page.team.undo).toHaveBeenCalledTimes(1);
    press({ key: 'Z', ctrlKey: true, shiftKey: true });
    press({ key: 'y', ctrlKey: true });
    press({ key: 'y', metaKey: true });
    expect(page.team.redo).toHaveBeenCalledTimes(3);
  });

  it('Cmd+Z works as well as Ctrl+Z', () => {
    mount();
    press({ key: 'z', metaKey: true });
    expect(page.team.undo).toHaveBeenCalledTimes(1);
  });

  it('ignores a plain key and any other Ctrl shortcut, leaving the browser’s own behaviour', () => {
    mount();
    expect(press({ key: 'z' }).defaultPrevented).toBe(false);
    expect(press({ key: 's', ctrlKey: true }).defaultPrevented).toBe(false);
    expect(page.team.undo).not.toHaveBeenCalled();
    expect(page.team.redo).not.toHaveBeenCalled();
  });

  it('leaves Ctrl+Z to the text field while typing', () => {
    mount();
    for (const tag of ['input', 'textarea']) {
      const el = document.body.appendChild(document.createElement(tag));
      expect(press({ key: 'z', ctrlKey: true }, el).defaultPrevented).toBe(false);
      el.remove();
    }
    const editable = document.body.appendChild(document.createElement('div'));
    Object.defineProperty(editable, 'isContentEditable', { value: true });
    expect(press({ key: 'z', ctrlKey: true }, editable).defaultPrevented).toBe(false);
    editable.remove();
    expect(page.team.undo).not.toHaveBeenCalled();
  });

  it('still reacts when the event comes from a non-element target such as the document', () => {
    mount();
    press({ key: 'z', ctrlKey: true }, document);
    expect(page.team.undo).toHaveBeenCalledTimes(1);
  });

  it('stops listening once the page is gone', () => {
    const { unmount } = mount();
    unmount();
    press({ key: 'z', ctrlKey: true });
    expect(page.team.undo).not.toHaveBeenCalled();
  });
});

describe('PublicTeamPage', () => {
  const view = (over: Record<string, unknown> = {}) => ({
    publicTeamStructure: { show_salary: false, structure, nodes, ...over },
  });
  const mountPublic = () =>
    renderWithProviders(<PublicTeamPage />, {
      initialEntries: ['/shared/tok'],
      routes: <Route path="/shared/:token" element={<PublicTeamPage />} />,
    });

  beforeEach(() => {
    page.publicQuery = { data: view(), loading: false, error: undefined };
  });

  it('shows a spinner while loading', () => {
    page.publicQuery = { data: undefined, loading: true, error: undefined };
    mountPublic();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('says the link is unavailable when it errors or answers nothing (revoked, expired or unknown)', () => {
    page.publicQuery = { data: undefined, loading: false, error: new Error('x') };
    const { unmount } = mountPublic();
    expect(screen.getByText('hr.teamStructure.public.unavailable')).toBeInTheDocument();
    unmount();
    page.publicQuery = { data: { publicTeamStructure: null }, loading: false, error: undefined };
    mountPublic();
    expect(screen.getByText('hr.teamStructure.public.unavailable')).toBeInTheDocument();
  });

  it('shows the read-only chart without a budget when salary is hidden', () => {
    mountPublic();
    expect(screen.getByRole('heading', { name: 'Core Team' })).toBeInTheDocument();
    expect(screen.getByText('The core')).toBeInTheDocument();
    expect(screen.getByTestId('canvas')).toHaveAttribute('data-nodes', '3');
    expect(screen.queryByText(/cost\.total/)).not.toBeInTheDocument();
    expect(page.canvas.onAddChild).toBeUndefined();
    expect(page.canvas.onReparent).toBeUndefined();
    expect(page.canvas.selectedId).toBeNull();
    expect(page.canvas.onSelect()).toBeUndefined();
  });

  it('shows the monthly budget only when the link allows salary', async () => {
    page.publicQuery = { data: view({ show_salary: true }), loading: false, error: undefined };
    mountPublic();
    await waitFor(() => expect(screen.getByText(/hr\.teamStructure\.cost\.total/)).toBeInTheDocument());
  });

  it('works for a team without a description', () => {
    page.publicQuery = { data: view({ structure: { ...structure, description: null } }), loading: false, error: undefined };
    mountPublic();
    expect(screen.queryByText('The core')).not.toBeInTheDocument();
  });
});
