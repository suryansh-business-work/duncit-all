import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Tpl } from './queries';

const m = vi.hoisted(() => ({
  data: undefined as unknown,
  loading: false,
  refetch: vi.fn(),
  run: vi.fn(),
  clientQuery: vi.fn(),
  confirmMock: vi.fn(),
}));
vi.mock('@apollo/client', async (io) => {
  const actual = await io<typeof import('@apollo/client')>();
  return {
    ...actual,
    useQuery: () => ({ data: m.data, loading: m.loading, refetch: m.refetch }),
    useMutation: () => [m.run, {}] as const,
    useApolloClient: () => ({ query: m.clientQuery }),
  };
});
vi.mock('@duncit/dialogs', () => ({ useConfirm: () => m.confirmMock }));

import { useEmailTemplateEditor } from './useEmailTemplateEditor';

const tpl: Tpl = {
  template_id: 't1', slug: 'welcome', name: 'Welcome', subject: 'Hi', mjml: '<mjml>a</mjml>',
  description: 'd', is_active: true,
  variables: [{ key: 'name', sample: 'Ana' }, { key: 'code' }],
};

beforeEach(() => {
  m.data = undefined;
  m.loading = false;
  m.refetch = vi.fn().mockResolvedValue({});
  m.run.mockReset();
  m.run.mockResolvedValue({ data: {} });
  m.clientQuery.mockReset();
  m.clientQuery.mockResolvedValue({ data: { renderEmailTemplate: { html: '<p/>', errors: [], detected_variables: ['name', 'extra'] } } });
  m.confirmMock.mockReset();
});

describe('useEmailTemplateEditor — empty state', () => {
  it('exposes empty list + null draft and guards save/delete/import', async () => {
    const { result } = renderHook(() => useEmailTemplateEditor());
    expect(result.current.list).toEqual([]);
    expect(result.current.draft).toBeNull();
    expect(result.current.hasData).toBe(false);
    expect(result.current.dirty).toBe(false);
    await act(async () => { await result.current.save(); });
    await act(async () => { await result.current.onDelete(); });
    act(() => { result.current.importDetected(); });
    // validateMjml with a null draft exercises renderPreview's early return.
    await act(async () => { await result.current.validateMjml(); });
    expect(result.current.snack).toEqual({ kind: 'success', msg: 'MJML looks good' });
    expect(m.run).not.toHaveBeenCalled();
    expect(m.confirmMock).not.toHaveBeenCalled();
    expect(m.clientQuery).not.toHaveBeenCalled();
  });
});

describe('useEmailTemplateEditor — with data', () => {
  beforeEach(() => { m.data = { emailTemplates: [tpl] }; });

  it('auto-selects the first template and derives the vars JSON', async () => {
    const { result } = renderHook(() => useEmailTemplateEditor());
    await waitFor(() => expect(result.current.selected).toBe('t1'));
    await waitFor(() => expect(result.current.draft?.template_id).toBe('t1'));
    const vars = JSON.parse(result.current.varsJson);
    expect(vars).toEqual({ name: 'Ana', code: '{{code}}' });
  });

  it('becomes dirty when the draft diverges', async () => {
    const { result } = renderHook(() => useEmailTemplateEditor());
    await waitFor(() => expect(result.current.draft).not.toBeNull());
    act(() => result.current.setDraft({ ...result.current.draft!, name: 'Changed' }));
    await waitFor(() => expect(result.current.dirty).toBe(true));
  });

  it('validates MJML: success then error, and handles a render throw', async () => {
    const { result } = renderHook(() => useEmailTemplateEditor());
    await waitFor(() => expect(result.current.draft).not.toBeNull());

    await act(async () => { await result.current.validateMjml(); });
    expect(result.current.snack).toEqual({ kind: 'success', msg: 'MJML looks good' });
    expect(result.current.previewHtml).toBe('<p/>');
    expect(result.current.detected).toEqual(['name', 'extra']);

    m.clientQuery.mockResolvedValueOnce({ data: { renderEmailTemplate: { html: '', errors: ['bad tag'], detected_variables: [] } } });
    await act(async () => { await result.current.validateMjml(); });
    expect(result.current.snack).toEqual({ kind: 'error', msg: '1 MJML issues' });

    m.clientQuery.mockRejectedValueOnce(new Error('render failed'));
    await act(async () => { await result.current.validateMjml(); });
    expect(result.current.previewErrors).toEqual(['render failed']);
  });

  it('handles a render response missing optional fields', async () => {
    m.clientQuery.mockResolvedValue({ data: { renderEmailTemplate: {} } });
    const { result } = renderHook(() => useEmailTemplateEditor());
    await waitFor(() => expect(result.current.draft).not.toBeNull());
    await act(async () => { await result.current.validateMjml(); });
    expect(result.current.previewHtml).toBe('');
    expect(result.current.detected).toEqual([]);
  });

  it('runs the debounced preview after the draft settles', async () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useEmailTemplateEditor());
      act(() => { vi.advanceTimersByTime(700); });
      await vi.waitFor(() => expect(m.clientQuery).toHaveBeenCalled());
    } finally {
      vi.useRealTimers();
    }
  });

  it('saves successfully and on error', async () => {
    const { result } = renderHook(() => useEmailTemplateEditor());
    await waitFor(() => expect(result.current.draft).not.toBeNull());

    await act(async () => { await result.current.save(); });
    expect(m.refetch).toHaveBeenCalled();
    expect(result.current.snack).toEqual({ kind: 'success', msg: 'Template saved' });

    m.run.mockRejectedValueOnce(new Error('save boom'));
    await act(async () => { await result.current.save(); });
    expect(result.current.snack).toEqual({ kind: 'error', msg: 'save boom' });
  });

  it('deletes after confirm and skips when declined', async () => {
    const { result } = renderHook(() => useEmailTemplateEditor());
    await waitFor(() => expect(result.current.draft).not.toBeNull());

    m.confirmMock.mockResolvedValueOnce(false);
    await act(async () => { await result.current.onDelete(); });
    expect(m.run).not.toHaveBeenCalled();

    m.confirmMock.mockResolvedValueOnce(true);
    await act(async () => { await result.current.onDelete(); });
    expect(result.current.snack).toEqual({ kind: 'success', msg: 'Deleted' });
    expect(m.run).toHaveBeenCalled();
  });

  it('imports detected variables not already present', async () => {
    const { result } = renderHook(() => useEmailTemplateEditor());
    await waitFor(() => expect(result.current.draft).not.toBeNull());
    await act(async () => { await result.current.validateMjml(); }); // detected = ['name','extra']
    act(() => result.current.importDetected());
    await waitFor(() => expect(result.current.draft!.variables.map((v) => v.key)).toContain('extra'));
    // existing 'name' not duplicated
    expect(result.current.draft!.variables.filter((v) => v.key === 'name')).toHaveLength(1);
  });

  it('exposes setters for snack and vars JSON', async () => {
    const { result } = renderHook(() => useEmailTemplateEditor());
    await waitFor(() => expect(result.current.draft).not.toBeNull());
    act(() => result.current.setSnack({ kind: 'error', msg: 'x' }));
    expect(result.current.snack).toEqual({ kind: 'error', msg: 'x' });
    act(() => result.current.setSnack(null));
    act(() => result.current.setVarsJson('{"a":1}'));
    expect(result.current.varsJson).toBe('{"a":1}');
    act(() => result.current.setTab('code'));
    expect(result.current.tab).toBe('code');
  });
});
