import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { copyToClipboard } from '@duncit/utils';
import ShareDialog from '../../../src/pages/team-structure/ShareDialog';

vi.mock('@duncit/app-settings', async (io) => ({
  ...(await (await import('./support')).withKeys(await io<typeof import('@duncit/app-settings')>())),
  formatDateTime: (iso: string) => `FMT(${iso})`,
}));

const apollo = vi.hoisted(() => ({
  shares: [] as any[],
  queryOptions: null as unknown as Record<string, any>,
  refetch: vi.fn(),
  create: vi.fn(),
  revoke: vi.fn(),
  creating: false,
}));

vi.mock('@apollo/client/react', () => ({
  useQuery: (_doc: unknown, options: Record<string, any>) => {
    apollo.queryOptions = options;
    return { data: { teamStructureShares: apollo.shares }, refetch: apollo.refetch };
  },
  // The first mutation hook in the component is create, the second revoke.
  useMutation: (doc: any) => {
    const name = doc.definitions[0].name.value as string;
    return name === 'CreateTeamStructureShare' ? [apollo.create, { loading: apollo.creating }] : [apollo.revoke];
  },
}));
vi.mock('@duncit/dialogs', () => ({ notifyError: vi.fn(), notifySuccess: vi.fn() }));
vi.mock('@duncit/utils', async (io) => ({ ...(await io<typeof import('@duncit/utils')>()), copyToClipboard: vi.fn() }));
// Typing into MUI X's sectioned date field is not what is under test; a plain input stands in.
vi.mock('@mui/x-date-pickers/DatePicker', () => ({
  DatePicker: ({ label, value, onChange }: any) => (
    <input aria-label={label} value={value ? value.toISOString() : ''} onChange={(e) => onChange(e.target.value ? new Date(e.target.value) : null)} />
  ),
}));

const future = new Date(Date.now() + 7 * 86_400_000).toISOString();
const past = new Date(Date.now() - 86_400_000).toISOString();
const share = (id: string, over: Record<string, unknown> = {}) => ({ id, token: `tok-${id}`, label: `Link ${id}`, show_salary: false, show_kpi_kra: false, expires_at: null, revoked_at: null, ...over });

const mount = (open = true) => {
  const onClose = vi.fn();
  render(<ShareDialog structureId="s1" open={open} onClose={onClose} />);
  return { onClose };
};

beforeEach(() => {
  apollo.shares = [];
  apollo.creating = false;
  apollo.refetch.mockReset().mockResolvedValue({});
  apollo.create.mockReset().mockResolvedValue({});
  apollo.revoke.mockReset().mockResolvedValue({});
  vi.mocked(notifyError).mockClear();
  vi.mocked(notifySuccess).mockClear();
  vi.mocked(copyToClipboard).mockReset().mockResolvedValue(true);
});

describe('listing links', () => {
  it('tells HR nobody outside can see the chart while there are no links', () => {
    mount();
    expect(screen.getByText('hr.teamStructure.share.none')).toBeInTheDocument();
  });

  it('shows each link with its label, expiry and what it reveals', () => {
    apollo.shares = [
      share('1', { label: 'Investors', expires_at: future }),
      share('2', { label: null, show_salary: true }),
    ];
    mount();
    expect(screen.getByText('Investors')).toBeInTheDocument();
    expect(screen.getByText(`hr.teamStructure.share.expiresOn|{"date":"FMT(${future})"}`)).toBeInTheDocument();
    expect(screen.getByText('hr.teamStructure.share.unlabelled')).toBeInTheDocument();
    expect(screen.getByText('hr.teamStructure.share.noExpiry')).toBeInTheDocument();
    expect(screen.getByText('hr.teamStructure.share.structureOnly')).toBeInTheDocument();
    expect(screen.getByText('hr.teamStructure.share.withSalary')).toBeInTheDocument();
    expect(screen.queryByText('hr.teamStructure.share.inactive')).not.toBeInTheDocument();
  });

  it('says which of salary and the scorecard a link reveals', () => {
    apollo.shares = [
      share('1', { show_kpi_kra: true }),
      share('2', { show_salary: true, show_kpi_kra: true }),
    ];
    mount();
    expect(screen.queryByText('hr.teamStructure.share.structureOnly')).not.toBeInTheDocument();
    expect(screen.getAllByText('hr.teamStructure.share.withKpiKra')).toHaveLength(2);
    expect(screen.getAllByText('hr.teamStructure.share.withSalary')).toHaveLength(1);
  });

  it('marks revoked and expired links inactive and disables copy and revoke on them', () => {
    apollo.shares = [share('1', { revoked_at: past }), share('2', { expires_at: past }), share('3')];
    mount();
    expect(screen.getAllByText('hr.teamStructure.share.inactive')).toHaveLength(2);
    const copies = screen.getAllByRole('button', { name: 'hr.teamStructure.share.copy' });
    const revokes = screen.getAllByRole('button', { name: 'hr.teamStructure.share.revoke' });
    expect(copies.map((b) => (b as HTMLButtonElement).disabled)).toEqual([true, true, false]);
    expect(revokes.map((b) => (b as HTMLButtonElement).disabled)).toEqual([true, true, false]);
  });

  it('does not load anything while closed', () => {
    mount(false);
    expect(apollo.queryOptions.skip).toBe(true);
  });

  it('loads the team’s links when open and closes on request', () => {
    const { onClose } = mount();
    expect(apollo.queryOptions).toMatchObject({ variables: { structure_id: 's1' }, skip: false });
    fireEvent.click(screen.getByRole('button', { name: 'hr.teamStructure.share.close' }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('copying', () => {
  it('copies the portal’s own public address for the link', async () => {
    apollo.shares = [share('1')];
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'hr.teamStructure.share.copy' }));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('hr.teamStructure.share.copied'));
    expect(copyToClipboard).toHaveBeenCalledWith(`${window.location.origin}/shared/tok-1`);
  });

  it('says so when the browser refuses the copy', async () => {
    vi.mocked(copyToClipboard).mockResolvedValue(false);
    apollo.shares = [share('1')];
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'hr.teamStructure.share.copy' }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('hr.teamStructure.share.copyFailed'));
    expect(notifySuccess).not.toHaveBeenCalled();
  });
});

describe('revoking', () => {
  it('revokes the link and reloads the list', async () => {
    apollo.shares = [share('9')];
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'hr.teamStructure.share.revoke' }));
    await waitFor(() => expect(apollo.refetch).toHaveBeenCalled());
    expect(apollo.revoke).toHaveBeenCalledWith({ variables: { id: '9' } });
  });

  it('reports a failure instead of swallowing it', async () => {
    apollo.revoke.mockRejectedValue(new Error('Access Denied'));
    apollo.shares = [share('9')];
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'hr.teamStructure.share.revoke' }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith(expect.stringContaining('Access Denied')));
    expect(apollo.refetch).not.toHaveBeenCalled();
  });
});

describe('creating a link', () => {
  it('creates a structure-only link by default, with no expiry', async () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'hr.teamStructure.share.create' }));
    await waitFor(() => expect(apollo.create).toHaveBeenCalled());
    expect(apollo.create).toHaveBeenCalledWith({ variables: { structure_id: 's1', label: null, show_salary: false, show_kpi_kra: false, expires_at: null } });
    expect(apollo.refetch).toHaveBeenCalled();
    expect(screen.queryByText('hr.teamStructure.share.salaryWarning')).not.toBeInTheDocument();
  });

  it('warns before salary is shared, then sends the label, flag and expiry, and clears the form', async () => {
    mount();
    fireEvent.change(screen.getByLabelText('hr.teamStructure.share.label'), { target: { value: 'Board' } });
    fireEvent.click(screen.getByLabelText('hr.teamStructure.share.showSalary'));
    fireEvent.click(screen.getByLabelText('hr.teamStructure.share.showKpiKra'));
    expect(screen.getByText('hr.teamStructure.share.salaryWarning')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('hr.teamStructure.share.expires'), { target: { value: future } });
    fireEvent.click(screen.getByRole('button', { name: 'hr.teamStructure.share.create' }));
    await waitFor(() => expect(apollo.create).toHaveBeenCalled());
    expect(apollo.create).toHaveBeenCalledWith({ variables: { structure_id: 's1', label: 'Board', show_salary: true, show_kpi_kra: true, expires_at: future } });
    await waitFor(() => expect(screen.queryByText('hr.teamStructure.share.salaryWarning')).not.toBeInTheDocument());
    expect((screen.getByLabelText('hr.teamStructure.share.label') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('hr.teamStructure.share.expires') as HTMLInputElement).value).toBe('');
  });

  it('can clear a chosen expiry again', () => {
    mount();
    const expires = screen.getByLabelText('hr.teamStructure.share.expires') as HTMLInputElement;
    fireEvent.change(expires, { target: { value: future } });
    expect(expires.value).toBe(future);
    fireEvent.change(expires, { target: { value: '' } });
    expect(expires.value).toBe('');
  });

  it('keeps the form and reports the reason when the server refuses', async () => {
    apollo.create.mockRejectedValue(new Error('Expiry must be a future date'));
    mount();
    fireEvent.change(screen.getByLabelText('hr.teamStructure.share.label'), { target: { value: 'Keep me' } });
    fireEvent.click(screen.getByRole('button', { name: 'hr.teamStructure.share.create' }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith(expect.stringContaining('future date')));
    expect((screen.getByLabelText('hr.teamStructure.share.label') as HTMLInputElement).value).toBe('Keep me');
  });

  it('cannot be pressed twice while creating', async () => {
    apollo.creating = true;
    mount();
    expect(screen.getByRole('button', { name: 'hr.teamStructure.share.create' })).toBeDisabled();
    await act(async () => undefined);
  });
});
