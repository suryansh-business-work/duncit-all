import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GraphQLError } from 'graphql';
import { LITE_CREATE_ENV_ENTRY, LITE_DELETE_ENV_ENTRY, LITE_SET_DEFAULT_ENV_ENTRY, LITE_TEST_ENV_ENTRY, LITE_UPDATE_ENV_ENTRY } from '../../../graphql/environment';
import { useEnvActions } from '../../../pages/environment/useEnvActions';
import { makeEnvEntry } from '../../fixtures';
import { gqlEnvEntry } from '../../gql-results';
import { findConfirm, findToast, Providers, type GqlMock } from '../../test-utils';

const entry = makeEnvEntry();
const input = { name: 'Primary SMTP', description: 'Relay', is_default: false, is_active: true, config: [{ key: 'host', value: 'smtp.example.com' }] };

const setup = (mocks: GqlMock[]) => {
  const reload = vi.fn();
  const wrapper = ({ children }: { children: ReactNode }) => <Providers mocks={mocks}>{children}</Providers>;
  const { result } = renderHook(() => useEnvActions('EMAIL', reload), { wrapper });
  return { reload, result };
};

const testResult = (ok: boolean, message: string) => ({ data: { liteTestEnvEntry: { __typename: 'LiteEnvTestResult', ok, message } } });

describe('useEnvActions', () => {
  it('creates a new entry in its category and reloads', async () => {
    const { result, reload } = setup([{ request: { query: LITE_CREATE_ENV_ENTRY, variables: { input: { ...input, category: 'EMAIL' } } }, result: { data: { liteCreateEnvEntry: gqlEnvEntry(entry) } } }]);
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.save(null, input);
    });
    expect(ok).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(await findToast('success')).toHaveTextContent('Primary SMTP created');
  });

  it('updates an existing entry by id', async () => {
    const { result } = setup([{ request: { query: LITE_UPDATE_ENV_ENTRY, variables: { id: 'env-1', input: { ...input, category: 'EMAIL' } } }, result: { data: { liteUpdateEnvEntry: gqlEnvEntry(entry) } } }]);
    await act(async () => {
      await result.current.save(entry, input);
    });
    expect(await findToast('success')).toHaveTextContent('Primary SMTP updated');
  });

  it('reports a refused save without reloading', async () => {
    const { result, reload } = setup([{ request: { query: LITE_CREATE_ENV_ENTRY, variables: { input: { ...input, category: 'EMAIL' } } }, result: { errors: [new GraphQLError('Port must be a whole number')] } }]);
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.save(null, input);
    });
    expect(ok).toBe(false);
    expect(reload).not.toHaveBeenCalled();
    expect(await findToast('error')).toHaveTextContent('Port must be a whole number');
  });

  it('deletes only after the admin confirms the fallback warning', async () => {
    const user = userEvent.setup();
    const remove = vi.fn(() => ({ data: { liteDeleteEnvEntry: true } }));
    const { result } = setup([{ request: { query: LITE_DELETE_ENV_ENTRY, variables: { id: 'env-1' } }, result: remove }]);

    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.remove(entry);
    });
    const confirm = within(await findConfirm());
    expect(confirm.getByText('Delete Primary SMTP?')).toBeInTheDocument();
    expect(confirm.getByText('Anything using it falls back to the default entry.')).toBeInTheDocument();
    await user.click(confirm.getByRole('button', { name: 'Delete' }));
    await act(() => pending);

    expect(remove).toHaveBeenCalledTimes(1);
    expect(await findToast('success')).toHaveTextContent('Primary SMTP deleted');
  });

  it('keeps the entry when the confirmation is cancelled', async () => {
    const user = userEvent.setup();
    const remove = vi.fn(() => ({ data: { liteDeleteEnvEntry: true } }));
    const { result, reload } = setup([{ request: { query: LITE_DELETE_ENV_ENTRY, variables: { id: 'env-1' } }, result: remove }]);
    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.remove(entry);
    });
    await user.click(within(await findConfirm()).getByRole('button', { name: 'Cancel' }));
    await act(() => pending);
    expect(remove).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('makes an entry the default', async () => {
    const { result } = setup([{ request: { query: LITE_SET_DEFAULT_ENV_ENTRY, variables: { id: 'env-1' } }, result: { data: { liteSetDefaultEnvEntry: gqlEnvEntry({ ...entry, is_default: true }) } } }]);
    await act(async () => {
      await result.current.setDefault(entry);
    });
    expect(await findToast('success')).toHaveTextContent('Primary SMTP is now the default');
  });

  it("passes a test with the server's message, sending to the address given", async () => {
    const { result, reload } = setup([{ request: { query: LITE_TEST_ENV_ENTRY, variables: { id: 'env-1', to: 'ops@lite.example' } }, result: testResult(true, 'Delivered to ops@lite.example') }]);
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.test(entry, 'ops@lite.example');
    });
    expect(ok).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(await findToast('success')).toHaveTextContent('Test passed: Delivered to ops@lite.example');
  });

  it('fails a test with the server message, still reloading so the last-test column updates', async () => {
    const { result, reload } = setup([{ request: { query: LITE_TEST_ENV_ENTRY, variables: { id: 'env-1', to: null } }, result: testResult(false, 'Authentication rejected') }]);
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.test(entry);
    });
    expect(ok).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(await findToast('error')).toHaveTextContent('Test failed: Authentication rejected');
  });

  it('reports a test the API refused to run, without reloading', async () => {
    const { result, reload } = setup([{ request: { query: LITE_TEST_ENV_ENTRY, variables: { id: 'env-1', to: null } }, result: { errors: [new GraphQLError('Entry not found')] } }]);
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.test(entry);
    });
    expect(ok).toBe(false);
    expect(reload).not.toHaveBeenCalled();
    expect(await findToast('error')).toHaveTextContent('Entry not found');
  });

  it('is idle until something runs', () => {
    const { result } = setup([]);
    expect(result.current.saving).toBe(false);
    expect(result.current.testing).toBe(false);
    expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
  });
});
