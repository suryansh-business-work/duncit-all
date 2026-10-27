import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { Route, useLocation } from 'react-router';
import { notifyError } from '@duncit/dialogs';
import TeamStructureListPage from '../../../src/pages/team-structure';
import { renderWithProviders } from '../../testkit';
import { structure } from './support';

vi.mock('@duncit/app-settings', async (io) => (await import('./support')).withKeys(await io<typeof import('@duncit/app-settings')>()));

const state = vi.hoisted(() => ({
  query: { data: undefined as any, loading: false, error: undefined as any },
  refetch: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
  saving: false,
  confirm: vi.fn(),
  table: null as unknown as Record<string, any>,
  form: null as unknown as Record<string, any>,
}));

vi.mock('@apollo/client/react', () => ({
  useQuery: () => ({ ...state.query, refetch: state.refetch }),
  useMutation: (doc: any) =>
    doc.definitions[0].name.value === 'SaveTeamStructure' ? [state.save, { loading: state.saving }] : [state.remove],
}));
vi.mock('@duncit/dialogs', () => ({ notifyError: vi.fn(), useConfirm: () => state.confirm }));
vi.mock('../../../src/pages/team-structure/TeamsTable', () => ({
  default: (props: any) => {
    state.table = props;
    return <div data-testid="table">{props.rows.map((r: any) => r.name).join(',')}</div>;
  },
}));
vi.mock('../../../src/pages/team-structure/TeamFormDialog', () => ({
  default: (props: any) => {
    state.form = props;
    return props.open ? <div data-testid="form">{props.team?.name ?? 'NEW'}</div> : null;
  },
}));

/** Runs a page callback the way React would, so its state updates are flushed. */
const call = (fn: () => unknown) =>
  act(async () => {
    await fn();
  });

const teams = [structure, { ...structure, id: 's2', name: 'Overseas' }];

const Where = () => <div data-testid="where">{useLocation().pathname}</div>;
const mount = () =>
  renderWithProviders(<TeamStructureListPage />, {
    initialEntries: ['/team-structure'],
    routes: (
      <>
        <Route path="/team-structure" element={<><TeamStructureListPage /><Where /></>} />
        <Route path="/team-structure/:id" element={<Where />} />
      </>
    ),
  });

beforeEach(() => {
  state.query = { data: { teamStructures: teams }, loading: false, error: undefined };
  state.saving = false;
  state.refetch.mockReset().mockResolvedValue({});
  state.save.mockReset().mockResolvedValue({ data: { saveTeamStructure: { id: 'new-1' } } });
  state.remove.mockReset().mockResolvedValue({});
  state.confirm.mockReset().mockResolvedValue(true);
  vi.mocked(notifyError).mockClear();
});

describe('the teams list', () => {
  it('shows every team in the table under the page title', () => {
    mount();
    expect(screen.getByText('hr.teamStructure.list.title')).toBeInTheDocument();
    expect(screen.getByTestId('table')).toHaveTextContent('Core Team,Overseas');
  });

  it('shows an empty table before any team exists', () => {
    state.query = { data: { teamStructures: [] }, loading: false, error: undefined };
    mount();
    expect(screen.getByTestId('table')).toHaveTextContent('');
    expect(state.table.rows).toEqual([]);
  });

  it('shows a spinner, not the table, while the first load runs', () => {
    state.query = { data: undefined, loading: true, error: undefined };
    mount();
    expect(screen.queryByTestId('table')).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('keeps showing the table while it refreshes in the background', () => {
    state.query = { data: { teamStructures: teams }, loading: true, error: undefined };
    mount();
    expect(screen.getByTestId('table')).toBeInTheDocument();
  });

  it('shows the error instead of the table when the query fails', () => {
    state.query = { data: undefined, loading: false, error: new Error('Access Denied') };
    mount();
    expect(screen.queryByTestId('table')).not.toBeInTheDocument();
    expect(screen.getByText(/Access Denied/)).toBeInTheDocument();
  });

  it('opens a team’s chart when its row is clicked', () => {
    mount();
    act(() => state.table.onOpen(teams[1]));
    return waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/team-structure/s2'));
  });
});

describe('creating a team', () => {
  it('opens an empty form, saves it, and goes straight to the new chart', async () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'hr.teamStructure.list.create' }));
    expect(screen.getByTestId('form')).toHaveTextContent('NEW');
    await call(() => state.form.onSubmit({ name: 'Ops', description: '', currency: 'INR' }));
    expect(state.save).toHaveBeenCalledWith({ variables: { name: 'Ops', description: null, currency: 'INR', id: null } });
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/team-structure/new-1'));
  });

  it('keeps a typed description', async () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'hr.teamStructure.list.create' }));
    await call(() => state.form.onSubmit({ name: 'Ops', description: 'Runs it', currency: 'INR' }));
    expect(state.save.mock.calls[0][0].variables.description).toBe('Runs it');
  });

  it('closes the form, and can be cancelled', async () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'hr.teamStructure.list.create' }));
    act(() => state.form.onClose());
    await waitFor(() => expect(screen.queryByTestId('form')).not.toBeInTheDocument());
  });

  it('keeps the form open and reports why when saving fails', async () => {
    state.save.mockRejectedValue(new Error('Team name taken'));
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'hr.teamStructure.list.create' }));
    await call(() => state.form.onSubmit({ name: 'Ops', currency: 'INR' }));
    expect(notifyError).toHaveBeenCalledWith(expect.stringContaining('Team name taken'));
    expect(screen.getByTestId('form')).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent('/team-structure');
  });

  it('passes the saving flag to the form', () => {
    state.saving = true;
    mount();
    expect(state.form.busy).toBe(true);
  });
});

describe('renaming a team', () => {
  it('opens the form on that team and, after saving, stays on the list and reloads it', async () => {
    mount();
    act(() => state.table.onEdit(teams[1]));
    await waitFor(() => expect(screen.getByTestId('form')).toHaveTextContent('Overseas'));
    await call(() => state.form.onSubmit({ name: 'Overseas 2', description: 'x', currency: 'USD' }));
    expect(state.save).toHaveBeenCalledWith({ variables: { name: 'Overseas 2', description: 'x', currency: 'USD', id: 's2' } });
    await waitFor(() => expect(state.refetch).toHaveBeenCalled());
    expect(screen.getByTestId('where')).toHaveTextContent('/team-structure');
    expect(screen.queryByTestId('form')).not.toBeInTheDocument();
  });
});

describe('deleting a team', () => {
  it('asks first, then deletes and reloads', async () => {
    mount();
    await call(() => state.table.onDelete(teams[0]));
    expect(state.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'hr.teamStructure.list.deleteTitle|{"name":"Core Team"}', destructive: true })
    );
    expect(state.remove).toHaveBeenCalledWith({ variables: { id: 's1' } });
    expect(state.refetch).toHaveBeenCalled();
  });

  it('does nothing when the user backs out', async () => {
    state.confirm.mockResolvedValue(false);
    mount();
    await call(() => state.table.onDelete(teams[0]));
    expect(state.remove).not.toHaveBeenCalled();
    expect(state.refetch).not.toHaveBeenCalled();
  });

  it('reports a failed delete and does not pretend it worked', async () => {
    state.remove.mockRejectedValue(new Error('Access Denied'));
    mount();
    await call(() => state.table.onDelete(teams[0]));
    expect(notifyError).toHaveBeenCalledWith(expect.stringContaining('Access Denied'));
    expect(state.refetch).not.toHaveBeenCalled();
  });
});
