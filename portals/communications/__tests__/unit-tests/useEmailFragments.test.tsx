import { act, renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CREATE_FRAGMENT,
  DELETE_FRAGMENT,
  FRAGMENTS,
  RESET_FRAGMENT,
  UPDATE_FRAGMENT,
  type Fragment,
} from '../../src/pages/email-fragments-page/queries';

const m = vi.hoisted(() => ({
  fragments: undefined as unknown,
  usage: undefined as unknown,
  refetch: vi.fn(),
  runners: new Map<unknown, ReturnType<typeof vi.fn>>(),
  impls: new Map<unknown, () => unknown>(),
  spyFor: (doc: unknown): ReturnType<typeof vi.fn> => {
    if (!m.runners.has(doc)) {
      m.runners.set(
        doc,
        vi.fn().mockImplementation(async () => (m.impls.get(doc) ?? (() => ({ data: {} })))())
      );
    }
    return m.runners.get(doc)!;
  },
  clientQuery: vi.fn(),
  client: {} as { query: unknown },
  confirm: vi.fn(),
}));
vi.mock('@apollo/client/react', async (io) => {
  const actual = await io<typeof import('@apollo/client/react')>();
  return {
    ...actual,
    useQuery: (doc: unknown) =>
      doc === FRAGMENTS
        ? { data: m.fragments, loading: false, refetch: m.refetch }
        : { data: m.usage, loading: false },
    useMutation: (doc: unknown) => [m.spyFor(doc), {}] as const,
    useApolloClient: () => m.client,
  };
});
vi.mock('@duncit/dialogs', () => ({ useConfirm: () => m.confirm }));

m.client = { query: m.clientQuery };

import { useEmailFragments } from '../../src/pages/email-fragments-page/useEmailFragments';

const frag = (key: string, over: Partial<Fragment> = {}): Fragment => ({
  fragment_id: `id-${key}`,
  key,
  name: key.toUpperCase(),
  is_system: true,
  header_mjml: `<h-${key}/>`,
  footer_mjml: `<f-${key}/>`,
  is_active: true,
  ...over,
});

const mount = (url = '/') =>
  renderHook(() => useEmailFragments(), {
    wrapper: ({ children }) => <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>,
  });

// One stable spy per mutation document (created on first use), so a test can
// swap what it does after the hook has mounted.
const runner = (doc: unknown, impl: () => unknown = () => ({ data: {} })) => {
  m.impls.set(doc, impl);
  return m.spyFor(doc);
};

beforeEach(() => {
  m.fragments = { emailFragments: [frag('transactional'), frag('weekend')] };
  m.usage = undefined;
  m.refetch = vi.fn().mockResolvedValue({});
  m.runners.clear();
  m.impls.clear();
  m.clientQuery.mockReset();
  m.clientQuery.mockResolvedValue({
    data: { renderEmailTemplate: { html: '<p>ok</p>', errors: [] } },
  });
  m.confirm.mockReset();
});

describe('useEmailFragments - selection and usage', () => {
  it('selects the first fragment and loads a draft copy of it', async () => {
    const { result } = mount();
    await waitFor(() => expect(result.current.selected).toBe('transactional'));
    await waitFor(() => expect(result.current.draft?.key).toBe('transactional'));
    expect(result.current.hasData).toBe(true);
    expect(result.current.dirty).toBe(false);
  });

  it('opens the fragment named by ?key= and falls back to the first when it is unknown', async () => {
    const named = mount('/?key=weekend');
    await waitFor(() => expect(named.result.current.selected).toBe('weekend'));
    const stale = mount('/?key=gone');
    await waitFor(() => expect(stale.result.current.selected).toBe('transactional'));
  });

  it('groups templates by fragment key and skips templates with no fragment', async () => {
    m.usage = {
      emailTemplates: [
        { template_id: 'a', slug: 'a', name: 'A', fragment_key: 'transactional', is_active: true },
        { template_id: 'b', slug: 'b', name: 'B', fragment_key: 'transactional', is_active: true },
        { template_id: 'c', slug: 'c', name: 'C', fragment_key: null, is_active: true },
      ],
    };
    const { result } = mount();
    expect(result.current.templatesByFragment.get('transactional')?.map((t) => t.slug)).toEqual([
      'a',
      'b',
    ]);
    expect(result.current.templatesByFragment.size).toBe(1);
  });

  it('is empty and inert when the list has not loaded', async () => {
    m.fragments = undefined;
    const { result } = mount();
    expect(result.current.list).toEqual([]);
    expect(result.current.hasData).toBe(false);
    await act(async () => {
      await result.current.save();
      await result.current.reset();
      await result.current.remove();
    });
    expect(m.confirm).not.toHaveBeenCalled();
    expect(m.clientQuery).not.toHaveBeenCalled();
  });

  it('turns dirty when the draft diverges from the saved fragment', async () => {
    const { result } = mount();
    await waitFor(() => expect(result.current.draft).not.toBeNull());
    act(() => result.current.setDraft({ ...result.current.draft!, name: 'Edited' }));
    await waitFor(() => expect(result.current.dirty).toBe(true));
  });
});

describe('useEmailFragments - preview', () => {
  it('renders the draft header and footer after the debounce', async () => {
    const { result } = mount();
    await waitFor(() => expect(result.current.previewHtml).toBe('<p>ok</p>'), { timeout: 3000 });
    const sent = m.clientQuery.mock.calls[0][0].variables.mjml as string;
    expect(sent).toContain('<h-transactional/>');
    expect(sent).toContain('<f-transactional/>');
    await waitFor(() => expect(result.current.previewLoading).toBe(false), { timeout: 3000 });
  });

  it('shows renderer errors next to the preview', async () => {
    m.clientQuery.mockResolvedValue({
      data: { renderEmailTemplate: { html: '', errors: ['bad tag'] } },
    });
    const { result } = mount();
    await waitFor(() => expect(result.current.previewErrors).toEqual(['bad tag']), {
      timeout: 3000,
    });
  });

  it('clears a stale preview when the renderer answers without a result', async () => {
    m.clientQuery.mockResolvedValueOnce({
      data: { renderEmailTemplate: { html: '<p>old</p>', errors: ['old warning'] } },
    });
    const { result } = mount();
    await waitFor(() => expect(result.current.previewHtml).toBe('<p>old</p>'), { timeout: 3000 });
    expect(result.current.previewErrors).toEqual(['old warning']);

    m.clientQuery.mockResolvedValueOnce({ data: undefined });
    act(() => result.current.setDraft({ ...result.current.draft!, name: 'Edited' }));
    await waitFor(() => expect(result.current.previewHtml).toBe(''), { timeout: 3000 });
    expect(result.current.previewErrors).toEqual([]);
  });

  it('shows a thrown request as a preview error', async () => {
    m.clientQuery.mockRejectedValue(new Error('network down'));
    const { result } = mount();
    await waitFor(() => expect(result.current.previewErrors).toEqual(['network down']), {
      timeout: 3000,
    });
    await waitFor(() => expect(result.current.previewLoading).toBe(false));
  });
});
describe('useEmailFragments - save, reset, create, remove', () => {
  const ready = async () => {
    const hook = mount();
    await waitFor(() => expect(hook.result.current.draft).not.toBeNull());
    return hook;
  };

  it('saves only the editable fields, refetches and reports success', async () => {
    const update = runner(UPDATE_FRAGMENT);
    const { result } = await ready();
    await act(async () => {
      await result.current.save();
    });
    expect(update).toHaveBeenCalledWith({
      variables: {
        key: 'transactional',
        input: {
          name: 'TRANSACTIONAL',
          description: undefined,
          header_mjml: '<h-transactional/>',
          footer_mjml: '<f-transactional/>',
          is_active: true,
        },
      },
    });
    expect(m.refetch).toHaveBeenCalled();
    expect(result.current.snack).toEqual({ kind: 'success', msg: 'Fragment saved' });
    expect(result.current.busy).toBe(false);
  });

  it('reports a failed save and clears busy', async () => {
    runner(UPDATE_FRAGMENT, () => {
      throw new Error('denied');
    });
    const { result } = await ready();
    await act(async () => {
      await result.current.save();
    });
    expect(result.current.snack).toEqual({ kind: 'error', msg: 'denied' });
    expect(result.current.busy).toBe(false);
  });

  it('resets only after confirmation', async () => {
    const reset = runner(RESET_FRAGMENT);
    const { result } = await ready();
    m.confirm.mockResolvedValueOnce(false);
    await act(async () => {
      await result.current.reset();
    });
    expect(reset).not.toHaveBeenCalled();

    m.confirm.mockResolvedValueOnce(true);
    await act(async () => {
      await result.current.reset();
    });
    expect(reset).toHaveBeenCalledWith({ variables: { key: 'transactional' } });
    expect(result.current.snack).toEqual({ kind: 'success', msg: 'Reset to the shipped version' });
  });

  it('reports a failed reset', async () => {
    runner(RESET_FRAGMENT, () => {
      throw new Error('reset failed');
    });
    const { result } = await ready();
    m.confirm.mockResolvedValue(true);
    await act(async () => {
      await result.current.reset();
    });
    expect(result.current.snack).toEqual({ kind: 'error', msg: 'reset failed' });
  });

  it('creates a fragment and selects the key the server returned', async () => {
    const create = runner(CREATE_FRAGMENT, () => ({
      data: { createEmailFragment: { key: 'weekend' } },
    }));
    const { result } = await ready();
    await act(async () => {
      await result.current.create('Weekend');
    });
    expect(create).toHaveBeenCalledWith({ variables: { input: { name: 'Weekend' } } });
    expect(result.current.selected).toBe('weekend');
    expect(result.current.snack).toEqual({ kind: 'success', msg: 'Fragment added' });
  });

  it('keeps the selection when the server returns no key, and reports a failed create', async () => {
    runner(CREATE_FRAGMENT, () => ({ data: null }));
    const { result } = await ready();
    await act(async () => {
      await result.current.create('X');
    });
    expect(result.current.selected).toBe('transactional');

    runner(CREATE_FRAGMENT, () => {
      throw new Error('duplicate name');
    });
    await act(async () => {
      await result.current.create('X');
    });
    expect(result.current.snack).toEqual({ kind: 'error', msg: 'duplicate name' });
  });

  it('deletes after confirmation, clears the selection, and reports failures', async () => {
    const del = runner(DELETE_FRAGMENT);
    const { result } = await ready();
    m.confirm.mockResolvedValueOnce(false);
    await act(async () => {
      await result.current.remove();
    });
    expect(del).not.toHaveBeenCalled();

    m.confirm.mockResolvedValueOnce(true);
    await act(async () => {
      await result.current.remove();
    });
    expect(del).toHaveBeenCalledWith({ variables: { key: 'transactional' } });
    expect(result.current.snack).toEqual({ kind: 'success', msg: 'Fragment deleted' });

    runner(DELETE_FRAGMENT, () => {
      throw new Error('system fragment');
    });
    await waitFor(() => expect(result.current.draft).not.toBeNull());
    m.confirm.mockResolvedValueOnce(true);
    await act(async () => {
      await result.current.remove();
    });
    expect(result.current.snack).toEqual({ kind: 'error', msg: 'system fragment' });
  });
});
