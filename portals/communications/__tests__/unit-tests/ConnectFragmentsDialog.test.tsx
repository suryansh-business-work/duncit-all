import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const m = vi.hoisted(() => ({ run: vi.fn(), loading: false }));
vi.mock('@apollo/client/react', async (io) => {
  const actual = await io<typeof import('@apollo/client/react')>();
  return { ...actual, useMutation: () => [m.run, { loading: m.loading }] as const };
});

import ConnectFragmentsDialog from '../../src/pages/email-templates-page/ConnectFragmentsDialog';
import type { FragmentPlanRow } from '../../src/pages/email-templates-page/queries';

const options = [
  { key: 'marketing', name: 'Marketing', is_active: true },
  { key: 'support', name: 'Support', is_active: true },
];

const plan = (rows: FragmentPlanRow[], connected = 0) => ({
  data: { connectEmailTemplateFragments: { connected, rows } },
});

const row = (slug: string, action: FragmentPlanRow['action'], category = 'authentication'): FragmentPlanRow => ({
  slug,
  category,
  action,
});

const renderDialog = (over: Partial<Parameters<typeof ConnectFragmentsDialog>[0]> = {}) => {
  const props = {
    open: true,
    fragmentOptions: options,
    onClose: vi.fn(),
    onDone: vi.fn(),
    onError: vi.fn(),
    ...over,
  };
  render(<ConnectFragmentsDialog {...props} />);
  return props;
};

beforeEach(() => {
  m.run.mockReset();
  m.loading = false;
});

describe('ConnectFragmentsDialog', () => {
  it('runs a dry run on open, shows what will change, and applies it', async () => {
    m.run
      .mockResolvedValueOnce(plan([row('a', 'linked'), row('b', 'stripped'), row('c', 'already')]))
      .mockResolvedValueOnce(plan([], 2));
    const props = renderDialog();

    expect(screen.getByText('Checking every template…')).toBeInTheDocument();
    expect(m.run).toHaveBeenCalledWith({ variables: { dry_run: true } });
    expect(await screen.findByText('2 template(s) will get a header and footer. 1 already have one.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Connect' }));
    await waitFor(() => expect(props.onDone).toHaveBeenCalledWith(2));
    expect(m.run).toHaveBeenLastCalledWith({ variables: { fallback_key: null, dry_run: false } });
  });

  it('says everything is already connected and keeps Connect disabled', async () => {
    m.run.mockResolvedValueOnce(plan([row('a', 'already')]));
    renderDialog();
    expect(await screen.findByText('Every template already has a header and footer.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect' })).toBeDisabled();
  });

  it("only moves an admin's own templates once a header/footer is picked for them", async () => {
    m.run.mockResolvedValueOnce(plan([row('mine', 'skipped', '(unmapped)')])).mockResolvedValueOnce(plan([], 1));
    const props = renderDialog();

    expect(
      await screen.findByText(
        '1 of your own template(s) have no header/footer of their own. Pick one for them, or leave them as they are.'
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect' })).toBeDisabled();

    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(within(screen.getByRole('listbox')).getByText('Marketing'));
    expect(screen.getByText('1 template(s) will get a header and footer. 0 already have one.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Connect' }));
    await waitFor(() => expect(props.onDone).toHaveBeenCalledWith(1));
    expect(m.run).toHaveBeenLastCalledWith({ variables: { fallback_key: 'marketing', dry_run: false } });
  });

  it('warns about templates naming a header/footer that does not exist', async () => {
    m.run.mockResolvedValueOnce(plan([row('x', 'no-fragment', 'gone'), row('y', 'no-fragment', 'gone')]));
    renderDialog();
    expect(
      await screen.findByText('2 template(s) name a header/footer that does not exist: x, y')
    ).toBeInTheDocument();
  });

  it('treats an empty response as nothing to do and nothing connected', async () => {
    m.run.mockResolvedValueOnce({ data: undefined }).mockResolvedValueOnce({ data: undefined });
    renderDialog();
    expect(await screen.findByText('Every template already has a header and footer.')).toBeInTheDocument();
  });

  it('reports 0 when the apply response carries no data', async () => {
    m.run.mockResolvedValueOnce(plan([row('a', 'linked')])).mockResolvedValueOnce({ data: undefined });
    const props = renderDialog();
    fireEvent.click(await screen.findByRole('button', { name: 'Connect' }));
    await waitFor(() => expect(props.onDone).toHaveBeenCalledWith(0));
  });

  it('reports a failed dry run and closes', async () => {
    m.run.mockRejectedValueOnce(new Error('offline'));
    const props = renderDialog();
    await waitFor(() =>
      expect(props.onError).toHaveBeenCalledWith('Could not connect the header and footer: offline')
    );
    expect(props.onClose).toHaveBeenCalled();
  });

  it('reports a failed apply, including a non-Error rejection', async () => {
    m.run
      .mockResolvedValueOnce(plan([row('a', 'linked')]))
      .mockRejectedValueOnce(new Error('denied'))
      .mockRejectedValueOnce('plain');
    const props = renderDialog();
    fireEvent.click(await screen.findByRole('button', { name: 'Connect' }));
    await waitFor(() =>
      expect(props.onError).toHaveBeenCalledWith('Could not connect the header and footer: denied')
    );
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }));
    await waitFor(() =>
      expect(props.onError).toHaveBeenCalledWith('Could not connect the header and footer: plain')
    );
  });

  it('runs nothing while closed, and cancels on request', async () => {
    const closed = renderDialog({ open: false });
    expect(m.run).not.toHaveBeenCalled();
    expect(closed.onClose).not.toHaveBeenCalled();

    m.run.mockResolvedValueOnce(plan([row('a', 'already')]));
    const props = renderDialog();
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(props.onClose).toHaveBeenCalled();
  });
});
