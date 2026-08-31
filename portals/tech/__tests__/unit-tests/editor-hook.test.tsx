import { act, renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeTpl } from '../mocks/email-template.mock';

const m = vi.hoisted(() => ({
  data: undefined as unknown,
  loading: false,
  refetch: vi.fn(),
  run: vi.fn(),
  clientQuery: vi.fn(),
  confirmMock: vi.fn(),
}));
vi.mock('@apollo/client/react', async (io) => {
  const actual = await io<typeof import('@apollo/client/react')>();
  return {
    ...actual,
    useQuery: () => ({ data: m.data, loading: m.loading, refetch: m.refetch }),
    useMutation: () => [m.run, {}] as const,
    useApolloClient: () => ({ query: m.clientQuery }),
  };
});
vi.mock('@duncit/dialogs', () => ({ useConfirm: () => m.confirmMock }));

import { useEmailTemplateEditor } from '../../src/pages/email-templates-page/useEmailTemplateEditor';

const tpl = makeTpl({
  mjml: '<mjml>a</mjml>',
  description: 'd',
  variables: [{ key: 'name', sample: 'Ana' }, { key: 'code' }],
});

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

/**
 * The hook reads `?slug=` to open a named template — how an email log row
 * links back to the template it came from — so it needs a router around it.
 */
const mount = (url = '/emails/templates') =>
  renderHook(() => useEmailTemplateEditor(), {
    wrapper: ({ children }) => <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>,
  });

describe('useEmailTemplateEditor — send counts', () => {
  it('keys the roll-up by slug, which is what the log rows carry', async () => {
    m.data = {
      emailTemplates: [tpl],
      emailTemplateUsage: [
        { slug: tpl.slug, sent: 12, skipped: 0, failed: 1, total: 13, last_sent_at: 'x', last_attempt_at: 'y' },
        { slug: 'some-other', sent: 4, skipped: 0, failed: 0, total: 4, last_sent_at: 'z', last_attempt_at: 'z' },
      ],
    };
    const { result } = mount();
    await waitFor(() => expect(result.current.usageBySlug.size).toBe(2));
    expect(result.current.usageBySlug.get(tpl.slug)?.sent).toBe(12);
    // A template with no rows in the log is simply absent — the strip renders
    // that as a zero rather than the page inventing an entry for it.
    expect(result.current.usageBySlug.get('never-sent')).toBeUndefined();
  });

  it('has an empty map, not a crash, before the roll-up answers', () => {
    m.data = { emailTemplates: [tpl] };
    const { result } = mount();
    expect(result.current.usageBySlug.size).toBe(0);
  });
});

describe('useEmailTemplateEditor — empty state', () => {
  it('exposes empty list + null draft and guards save/delete/import', async () => {
    const { result } = mount();
    expect(result.current.list).toEqual([]);
    expect(result.current.draft).toBeNull();
    expect(result.current.hasData).toBe(false);
    expect(result.current.dirty).toBe(false);
    await act(async () => {
      await result.current.save();
    });
    await act(async () => {
      await result.current.onDelete();
    });
    act(() => {
      result.current.importDetected();
    });
    // validateMjml with a null draft exercises renderPreview's early return.
    await act(async () => {
      await result.current.validateMjml();
    });
    expect(result.current.snack).toEqual({ kind: 'success', msg: 'MJML looks good' });
    expect(m.run).not.toHaveBeenCalled();
    expect(m.confirmMock).not.toHaveBeenCalled();
    expect(m.clientQuery).not.toHaveBeenCalled();
  });
});

describe('useEmailTemplateEditor — with data', () => {
  beforeEach(() => {
    m.data = { emailTemplates: [tpl] };
  });

  it('auto-selects the first template and derives the vars JSON', async () => {
    const { result } = mount();
    await waitFor(() => expect(result.current.selected).toBe('t1'));
    await waitFor(() => expect(result.current.draft?.template_id).toBe('t1'));
    const vars = JSON.parse(result.current.varsJson);
    expect(vars).toEqual({ name: 'Ana', code: '{{code}}' });
  });

  it('opens the template named by ?slug=, which is how a log row links back', async () => {
    const other = makeTpl({ template_id: 't2', slug: 'password-reset', name: 'Reset' });
    m.data = { emailTemplates: [tpl, other] };

    const { result } = mount('/emails/templates?slug=password-reset');

    // Not the first in the list — the one the link asked for.
    await waitFor(() => expect(result.current.selected).toBe('t2'));
  });

  it('falls back to the first template when the slug matches nothing', async () => {
    const { result } = mount('/emails/templates?slug=does-not-exist');
    await waitFor(() => expect(result.current.selected).toBe('t1'));
  });

  it('becomes dirty when the draft diverges', async () => {
    const { result } = mount();
    await waitFor(() => expect(result.current.draft).not.toBeNull());
    act(() => result.current.setDraft({ ...result.current.draft!, name: 'Changed' }));
    await waitFor(() => expect(result.current.dirty).toBe(true));
  });

  it('validates MJML: success then error, and handles a render throw', async () => {
    const { result } = mount();
    await waitFor(() => expect(result.current.draft).not.toBeNull());

    await act(async () => {
      await result.current.validateMjml();
    });
    expect(result.current.snack).toEqual({ kind: 'success', msg: 'MJML looks good' });
    expect(result.current.previewHtml).toBe('<p/>');
    expect(result.current.detected).toEqual(['name', 'extra']);

    m.clientQuery.mockResolvedValueOnce({ data: { renderEmailTemplate: { html: '', errors: ['bad tag'], detected_variables: [] } } });
    await act(async () => {
      await result.current.validateMjml();
    });
    expect(result.current.snack).toEqual({ kind: 'error', msg: '1 MJML issues' });

    m.clientQuery.mockRejectedValueOnce(new Error('render failed'));
    await act(async () => {
      await result.current.validateMjml();
    });
    expect(result.current.previewErrors).toEqual(['render failed']);
  });

  it('handles a render response missing optional fields', async () => {
    m.clientQuery.mockResolvedValue({ data: { renderEmailTemplate: {} } });
    const { result } = mount();
    await waitFor(() => expect(result.current.draft).not.toBeNull());
    await act(async () => {
      await result.current.validateMjml();
    });
    expect(result.current.previewHtml).toBe('');
    expect(result.current.detected).toEqual([]);
  });

  it('runs the debounced preview after the draft settles', async () => {
    vi.useFakeTimers();
    try {
      mount();
      act(() => {
        vi.advanceTimersByTime(700);
      });
      await vi.waitFor(() => expect(m.clientQuery).toHaveBeenCalled());
    } finally {
      vi.useRealTimers();
    }
  });

  it('saves successfully and on error', async () => {
    const { result } = mount();
    await waitFor(() => expect(result.current.draft).not.toBeNull());

    await act(async () => {
      await result.current.save();
    });
    expect(m.refetch).toHaveBeenCalled();
    expect(result.current.snack).toEqual({ kind: 'success', msg: 'Template saved' });

    m.run.mockRejectedValueOnce(new Error('save boom'));
    await act(async () => {
      await result.current.save();
    });
    expect(result.current.snack).toEqual({ kind: 'error', msg: 'save boom' });
  });

  it('deletes after confirm and skips when declined', async () => {
    const { result } = mount();
    await waitFor(() => expect(result.current.draft).not.toBeNull());

    m.confirmMock.mockResolvedValueOnce(false);
    await act(async () => {
      await result.current.onDelete();
    });
    expect(m.run).not.toHaveBeenCalled();

    m.confirmMock.mockResolvedValueOnce(true);
    await act(async () => {
      await result.current.onDelete();
    });
    expect(result.current.snack).toEqual({ kind: 'success', msg: 'Deleted' });
    expect(m.run).toHaveBeenCalled();
  });

  it('imports detected variables not already present', async () => {
    const { result } = mount();
    await waitFor(() => expect(result.current.draft).not.toBeNull());
    await act(async () => {
      await result.current.validateMjml();
    }); // detected = ['name','extra']
    act(() => result.current.importDetected());
    await waitFor(() => expect(result.current.draft!.variables.map((v) => v.key)).toContain('extra'));
    // existing 'name' not duplicated
    expect(result.current.draft!.variables.filter((v) => v.key === 'name')).toHaveLength(1);
  });

  it('exposes setters for snack and vars JSON', async () => {
    const { result } = mount();
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

/**
 * Auto-save runs on a timer, so every test here drives the clock rather than
 * waiting on one — and the mocked list never changes, which is precisely the
 * situation a naive "save while dirty" loop would never escape.
 */
describe('useEmailTemplateEditor — auto-save', () => {
  beforeEach(() => {
    m.data = { emailTemplates: [tpl] };
  });

  const tick = async (ms: number) => {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms);
    });
  };

  it('writes an edit on its own once the typing stops, and says nothing', async () => {
    vi.useFakeTimers();
    try {
      const { result } = mount();
      act(() => result.current.setDraft({ ...result.current.draft!, name: 'Auto' }));
      expect(result.current.dirty).toBe(true);
      expect(m.run).not.toHaveBeenCalled(); // not on the keystroke

      await tick(1300);
      expect(m.run).toHaveBeenCalledTimes(1);
      expect(result.current.savedAt).toEqual(expect.any(Number));
      // Pressing Save says "Template saved"; the timer must not, or the
      // screen fills with toasts nobody asked for.
      expect(result.current.snack).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('never writes the same edit twice, however long the draft stays dirty', async () => {
    vi.useFakeTimers();
    try {
      const { result } = mount();
      act(() => result.current.setDraft({ ...result.current.draft!, name: 'Auto' }));
      await tick(1300);
      expect(m.run).toHaveBeenCalledTimes(1);

      // The mocked list still holds the ORIGINAL template, so the draft is
      // still dirty — a loop keyed on `dirty` alone would save forever.
      expect(result.current.dirty).toBe(true);
      await tick(10_000);
      expect(m.run).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('saves the NEXT edit, so switching off is the only way to stop it', async () => {
    vi.useFakeTimers();
    try {
      const { result } = mount();
      act(() => result.current.setDraft({ ...result.current.draft!, name: 'One' }));
      await tick(1300);
      act(() => result.current.setDraft({ ...result.current.draft!, name: 'Two' }));
      await tick(1300);
      expect(m.run).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('writes nothing at all once the switch is off', async () => {
    vi.useFakeTimers();
    try {
      const { result } = mount();
      act(() => result.current.setAutoSave(false));
      act(() => result.current.setDraft({ ...result.current.draft!, name: 'Manual' }));
      await tick(5000);
      expect(m.run).not.toHaveBeenCalled();
      expect(result.current.autoSave).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('speaks up when it fails — nobody pressed anything, so silence reads as saved', async () => {
    vi.useFakeTimers();
    try {
      m.run.mockRejectedValueOnce(new Error('server said no'));
      const { result } = mount();
      act(() => result.current.setDraft({ ...result.current.draft!, name: 'Auto' }));
      await tick(1300);
      expect(result.current.snack).toEqual({ kind: 'error', msg: 'server said no' });
    } finally {
      vi.useRealTimers();
    }
  });

  /**
   * The editor used to reload the draft from every answer this query gave,
   * and `cache-and-network` gives one after every save — so an edit typed
   * while the save was in flight was silently thrown away.
   */
  it('keeps what is being typed when the list answers again', async () => {
    const { result } = mount();
    await waitFor(() => expect(result.current.draft).not.toBeNull());
    act(() => result.current.setDraft({ ...result.current.draft!, name: 'Half-typed' }));

    // A fresh object from the server: same template, new identity.
    act(() => {
      m.data = { emailTemplates: [{ ...tpl }] };
    });
    act(() => result.current.setSelected('t1'));

    expect(result.current.draft!.name).toBe('Half-typed');
  });
});

describe('useEmailTemplateEditor — preview loading', () => {
  beforeEach(() => {
    m.data = { emailTemplates: [tpl] };
  });

  it('is stale from the keystroke, not from the request', async () => {
    vi.useFakeTimers();
    try {
      const { result } = mount();
      // Before the debounce has even elapsed — the silent half-second is
      // most of what an operator experiences as lag.
      expect(result.current.previewLoading).toBe(true);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(700);
      });
      expect(result.current.previewLoading).toBe(false);
      expect(result.current.previewHtml).toBe('<p/>');
    } finally {
      vi.useRealTimers();
    }
  });

  it('clears the wait even when the render throws', async () => {
    const { result } = mount();
    await waitFor(() => expect(result.current.draft).not.toBeNull());
    m.clientQuery.mockRejectedValueOnce(new Error('boom'));
    await act(async () => {
      await result.current.validateMjml();
    });
    expect(result.current.previewLoading).toBe(false);
  });
});
