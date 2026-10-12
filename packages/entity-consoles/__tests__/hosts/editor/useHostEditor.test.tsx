import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { GraphQLError } from 'graphql';
import { useHostEditor } from '../../../src/hosts/editor/useHostEditor';
import { hostToValues } from '../../../src/hosts/editor/mappers';
import {
  ADMIN_CREATE_HOST,
  ADMIN_UPDATE_HOST,
  HOST_DETAIL,
  SET_HOST_ACTIVE,
  SET_HOST_DEDUCTIONS,
  SET_HOST_VENUE_REQUEST_LIMIT,
} from '../../../src/hosts/queries';
import { hostRecord } from '../../fixtures';
import { hostDetailMock, hostPayload } from '../../../src/hosts/__tests__/host-response';

const session = vi.hoisted(() => ({ roles: ['SUPER_ADMIN'] as string[] }));
const calls = vi.hoisted(() => ({ log: [] as { op: string; variables: Record<string, unknown> }[] }));

vi.mock('@duncit/user-context', () => ({
  useUserData: () => ({ user: { roles: session.roles } }),
}));

const HOST_ID = hostRecord.id;

const write = (
  op: string,
  query: MockedResponse['request']['query'],
  data: Record<string, unknown>,
  options: { error?: Error; times?: number } = {},
): MockedResponse => ({
  request: {
    query,
    variables: (variables: Record<string, unknown>) => {
      calls.log.push({ op, variables });
      return true;
    },
  },
  maxUsageCount: options.times ?? 1,
  ...(options.error ? { error: options.error } : { result: { data } }),
});

const host = (id = HOST_ID) => ({ __typename: 'Host', id, status: 'APPROVED' });

const governanceMocks = () => [
  write('update', ADMIN_UPDATE_HOST, { adminUpdateHost: host() }),
  write('deductions', SET_HOST_DEDUCTIONS, { setHostDeductions: true }),
  write('active', SET_HOST_ACTIVE, { setHostActive: { __typename: 'Host', id: HOST_ID, is_active: false } }),
  write('limit', SET_HOST_VENUE_REQUEST_LIMIT, {
    setHostVenueRequestLimit: { __typename: 'Host', id: HOST_ID, venue_requests_limit_override: 4 },
  }),
];

const ops = () => calls.log.map((entry) => entry.op);

function mount(entry: string, hostId: string, mocks: MockedResponse[]) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="*" element={children} />
        </Routes>
      </MemoryRouter>
    </MockedProvider>
  );
  return renderHook(() => ({ editor: useHostEditor(hostId), location: useLocation() }), { wrapper });
}

const loadedEdit = async (mocks: MockedResponse[]) => {
  const view = mount(`/hosts/${HOST_ID}/edit`, HOST_ID, [
    hostDetailMock(HOST_ID, hostPayload()),
    ...mocks,
  ]);
  await waitFor(() => expect(view.result.current.editor.host).not.toBeNull());
  return view;
};

beforeEach(() => {
  calls.log.length = 0;
  session.roles = ['SUPER_ADMIN'];
});

describe('useHostEditor / loading', () => {
  it('starts blank and not loading while appointing a host', () => {
    const { result } = mount('/hosts/new', '', []);
    const { editor } = result.current;

    expect(editor.isEdit).toBe(false);
    expect(editor.host).toBeNull();
    expect(editor.loading).toBe(false);
    expect(editor.form.getValues('full_name')).toBe('');
  });

  it('hydrates the form from the stored host', async () => {
    const { result } = await loadedEdit([]);
    expect(result.current.editor.isEdit).toBe(true);
    await waitFor(() =>
      expect(result.current.editor.form.getValues('full_name')).toBe(hostRecord.full_name),
    );
  });

  it('reports a failed read as the query error', async () => {
    const view = mount(`/hosts/${HOST_ID}/edit`, HOST_ID, [
      {
        request: { query: HOST_DETAIL, variables: { host_doc_id: HOST_ID } },
        result: { errors: [new GraphQLError('Forbidden')] },
      },
    ]);
    await waitFor(() => expect(view.result.current.editor.error?.message).toBe('Forbidden'));
  });
});

describe('useHostEditor / saving an existing host', () => {
  it('writes the record, the commission, the live switch and the request limit', async () => {
    const { result } = await loadedEdit(governanceMocks());

    await act(async () => {
      await result.current.editor.submit({
        ...hostToValues(hostPayload()),
        status: 'REJECTED',
        is_active: false,
        host_commission_pct: 14,
        venue_requests_limit_override: '4',
      });
    });

    expect(ops()).toEqual(['update', 'deductions', 'active', 'limit']);
    const byOp = Object.fromEntries(calls.log.map((entry) => [entry.op, entry.variables]));
    expect(byOp.update).toMatchObject({ host_doc_id: HOST_ID, status: 'REJECTED' });
    // Only a complete Super → Category → Sub row is sent; the abandoned one is dropped.
    expect(byOp.update.categories).toEqual([
      {
        super_category_id: '66a0000000000000000000a1',
        category_id: '66a0000000000000000000b2',
        sub_category_id: '66a0000000000000000000c3',
      },
    ]);
    expect(byOp.deductions).toEqual({ user_id: hostRecord.user_id, host_commission_pct: 14 });
    expect(byOp.active).toEqual({ host_doc_id: HOST_ID, active: false });
    expect(byOp.limit).toEqual({ host_doc_id: HOST_ID, limit: 4 });
    expect(result.current.location.pathname).toBe(`/hosts/${HOST_ID}`);
    expect(result.current.editor.saveError).toBeNull();
  });

  it('sends no live switch or limit when neither moved', async () => {
    const { result } = await loadedEdit(governanceMocks());

    await act(async () => {
      await result.current.editor.submit(hostToValues(hostPayload()));
    });

    expect(ops()).toEqual(['update', 'deductions']);
  });

  it('clears an existing request limit with null', async () => {
    const { result } = mount(`/hosts/${HOST_ID}/edit`, HOST_ID, [
      hostDetailMock(HOST_ID, hostPayload({ venue_requests_limit_override: 6 })),
      ...governanceMocks(),
    ]);
    await waitFor(() => expect(result.current.editor.host).not.toBeNull());

    await act(async () => {
      await result.current.editor.submit({
        ...hostToValues(hostPayload({ venue_requests_limit_override: 6 })),
        venue_requests_limit_override: '',
      });
    });

    expect(ops()).toEqual(['update', 'deductions', 'limit']);
    expect(calls.log.at(-1)?.variables).toEqual({ host_doc_id: HOST_ID, limit: null });
  });

  it('writes details only, with no status, for a viewer who may not govern', async () => {
    session.roles = ['ALL_HOSTS_ACCESS'];
    const { result } = await loadedEdit(governanceMocks());

    await act(async () => {
      await result.current.editor.submit({
        ...hostToValues(hostPayload()),
        status: 'REJECTED',
        is_active: false,
        host_commission_pct: 90,
      });
    });

    expect(result.current.editor.canGovern).toBe(false);
    expect(ops()).toEqual(['update']);
    expect(calls.log[0].variables.status).toBeUndefined();
  });

  it('stays on the page with the server message when the write fails', async () => {
    const { result } = await loadedEdit([
      write('update', ADMIN_UPDATE_HOST, {}, { error: new Error('Aadhaar already used') }),
    ]);

    await act(async () => {
      await result.current.editor.submit(hostToValues(hostPayload()));
    });

    expect(result.current.editor.saveError).toBe('Aadhaar already used');
    expect(result.current.location.pathname).toBe(`/hosts/${HOST_ID}/edit`);
    expect(result.current.editor.busy).toBe(false);
  });
});

describe('useHostEditor / appointing a host', () => {
  const create = (data: Record<string, unknown>) => write('create', ADMIN_CREATE_HOST, data);

  it('creates, then applies the categories the create call does not take, and opens the host', async () => {
    const { result } = mount('/hosts/new', '', [
      create({ adminCreateHost: host('h-new') }),
      write('update', ADMIN_UPDATE_HOST, { adminUpdateHost: host('h-new') }),
      write('deductions', SET_HOST_DEDUCTIONS, { setHostDeductions: true }),
    ]);

    await act(async () => {
      await result.current.editor.submit({
        ...hostToValues(hostPayload()),
        id: '',
        status: 'APPROVED',
      });
    });

    expect(ops()).toEqual(['create', 'update', 'deductions']);
    expect(calls.log[0].variables).toMatchObject({
      target_user_id: hostRecord.user_id,
      submit: true,
    });
    expect(calls.log[1].variables.host_doc_id).toBe('h-new');
    expect(result.current.location.pathname).toBe('/hosts/h-new');
  });

  it('skips the second write when there are no categories to apply, and keeps a draft a draft', async () => {
    const { result } = mount('/hosts/new', '', [
      create({ adminCreateHost: host('h-new') }),
      write('deductions', SET_HOST_DEDUCTIONS, { setHostDeductions: true }),
    ]);

    await act(async () => {
      await result.current.editor.submit({
        ...hostToValues(hostPayload()),
        id: '',
        status: 'DRAFT',
        categories: [],
      });
    });

    expect(ops()).toEqual(['create', 'deductions']);
    expect(calls.log[0].variables.submit).toBe(false);
  });

  it('never submits for review on behalf of a viewer who may not govern', async () => {
    session.roles = ['ALL_HOSTS_ACCESS'];
    const { result } = mount('/hosts/new', '', [create({ adminCreateHost: host('h-new') })]);

    await act(async () => {
      await result.current.editor.submit({
        ...hostToValues(hostPayload()),
        id: '',
        status: 'APPROVED',
        categories: [],
      });
    });

    expect(calls.log[0].variables.submit).toBe(false);
    expect(ops()).toEqual(['create']);
  });

  it('stops and says so when the create call answers without an id', async () => {
    const { result } = mount('/hosts/new', '', [create({ adminCreateHost: null })]);

    await act(async () => {
      await result.current.editor.submit({ ...hostToValues(hostPayload()), id: '' });
    });

    expect(result.current.editor.saveError).toBe('The host was not saved — no id came back.');
    expect(ops()).toEqual(['create']);
  });
});
