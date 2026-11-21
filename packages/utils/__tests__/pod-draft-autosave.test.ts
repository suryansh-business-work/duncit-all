import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DRAFT_AUTOSAVE_DEBOUNCE_MS,
  DRAFT_AUTOSAVE_RETRY_MAX_MS,
  DRAFT_AUTOSAVE_RETRY_MS,
  createDraftAutosaver,
  isPodDraftId,
  newPodDraftId,
  type DraftSaveStatus,
} from '../src/pod-draft-autosave';

describe('isPodDraftId', () => {
  it('accepts a 24-digit lowercase hex id', () => {
    expect(isPodDraftId('65f1a2b3c4d5e6f708192a3b')).toBe(true);
  });

  it.each([
    ['too short', '65f1a2b3c4d5e6f708192a3'],
    ['too long', '65f1a2b3c4d5e6f708192a3bc'],
    ['uppercase', '65F1A2B3C4D5E6F708192A3B'],
    ['not hex', '65f1a2b3c4d5e6f708192a3z'],
    ['empty', ''],
  ])('rejects an id that is %s', (_label, id) => {
    expect(isPodDraftId(id)).toBe(false);
  });

  it('rejects anything that is not a string', () => {
    expect(isPodDraftId(undefined)).toBe(false);
    expect(isPodDraftId(42)).toBe(false);
  });
});

describe('newPodDraftId', () => {
  const uuid = () => '0123abcd-ef45-4678-9abc-def012345678';
  const NOW = Date.UTC(2026, 10, 21, 10, 0, 0);

  it('leads with the creation second in hex, like an ObjectId', () => {
    const id = newPodDraftId(uuid, NOW);
    expect(id.slice(0, 8)).toBe(Math.floor(NOW / 1000).toString(16));
  });

  it('fills the rest from the UUID, skipping its fixed version and variant digits', () => {
    // hex: 0123abcdef45 4 678 9 abcdef012345678 → version "4" and variant "9" dropped
    expect(newPodDraftId(uuid, NOW).slice(8)).toBe('0123abcdef45678a');
  });

  it('always gives a valid draft id', () => {
    expect(isPodDraftId(newPodDraftId(uuid, NOW))).toBe(true);
    expect(isPodDraftId(newPodDraftId(() => 'FFFFFFFF-FFFF-4FFF-BFFF-FFFFFFFFFFFF', NOW))).toBe(true);
  });

  it('gives different ids for different UUIDs in the same second', () => {
    const other = () => '9999abcd-ef45-4678-9abc-def012345678';
    expect(newPodDraftId(uuid, NOW)).not.toBe(newPodDraftId(other, NOW));
  });
});

describe('createDraftAutosaver', () => {
  let form: { title: string };
  let statuses: DraftSaveStatus[];

  const build = (save = vi.fn().mockResolvedValue(undefined), onError = vi.fn()) => {
    const saver = createDraftAutosaver({
      read: () => ({ ...form }),
      save,
      onStatus: (status) => statuses.push(status),
      onError,
    });
    return { saver, save, onError };
  };
  const edit = (title: string) => {
    form = { title };
  };

  beforeEach(() => {
    vi.useFakeTimers();
    form = { title: '' };
    statuses = [];
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('sends nothing while the form matches what was loaded', async () => {
    const { saver, save } = build();
    saver.schedule();
    await vi.advanceTimersByTimeAsync(DRAFT_AUTOSAVE_DEBOUNCE_MS * 2);
    expect(save).not.toHaveBeenCalled();
    expect(saver.hasUnsaved()).toBe(false);
    expect(saver.status()).toBe('idle');
  });

  it('saves once after the host pauses, not on every keystroke', async () => {
    const { saver, save } = build();
    for (const title of ['B', 'Bo', 'Boa', 'Boar']) {
      edit(title);
      saver.schedule();
      await vi.advanceTimersByTimeAsync(DRAFT_AUTOSAVE_DEBOUNCE_MS - 100);
    }
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(100);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ title: 'Boar' });
    expect(statuses).toEqual(['saving', 'saved']);
    expect(saver.hasUnsaved()).toBe(false);
  });

  it('does not save again when an edit is undone back to the saved form', async () => {
    const { saver, save } = build();
    edit('Board games');
    await saver.flush();
    edit('Board games!');
    saver.schedule();
    edit('Board games');
    saver.schedule();
    await vi.advanceTimersByTimeAsync(DRAFT_AUTOSAVE_DEBOUNCE_MS);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('treats a re-baselined form as saved (markSaved)', async () => {
    const { saver, save } = build();
    edit('Filled on mount');
    saver.markSaved();
    saver.schedule();
    await vi.advanceTimersByTimeAsync(DRAFT_AUTOSAVE_DEBOUNCE_MS);
    expect(save).not.toHaveBeenCalled();
  });

  it('counts a save still in flight as unsaved, and flush waits for it', async () => {
    let finish: () => void = () => undefined;
    const save = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const { saver } = build(save);
    edit('Quiz night');
    const flushed = saver.flush();
    expect(saver.status()).toBe('saving');
    expect(saver.hasUnsaved()).toBe(true);
    finish();
    await expect(flushed).resolves.toBe(true);
    expect(saver.hasUnsaved()).toBe(false);
  });

  it('never runs two saves at once, and saves an edit made mid-flight after the first', async () => {
    const resolvers: Array<() => void> = [];
    const save = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolvers.push(resolve);
        }),
    );
    const { saver } = build(save);
    edit('One');
    const flushed = saver.flush();
    edit('Two');
    const second = saver.flush();
    expect(save).toHaveBeenCalledTimes(1);
    resolvers[0]?.();
    await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect(save).toHaveBeenLastCalledWith({ title: 'Two' });
    resolvers[1]?.();
    await expect(flushed).resolves.toBe(true);
    await expect(second).resolves.toBe(true);
  });

  it('reports a failed save, keeps it unsaved, and retries with a growing back-off', async () => {
    const save = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(undefined);
    const { saver, onError } = build(save);
    edit('Pottery');
    await expect(saver.flush()).resolves.toBe(false);
    expect(saver.status()).toBe('error');
    expect(saver.hasUnsaved()).toBe(true);
    expect(onError).toHaveBeenCalledWith(new Error('offline'));

    await vi.advanceTimersByTimeAsync(DRAFT_AUTOSAVE_RETRY_MS - 1);
    expect(save).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(save).toHaveBeenCalledTimes(2);
    // Second failure doubles the wait.
    await vi.advanceTimersByTimeAsync(DRAFT_AUTOSAVE_RETRY_MS * 2);
    expect(save).toHaveBeenCalledTimes(3);
    expect(saver.status()).toBe('saved');
    expect(statuses).toEqual(['saving', 'error', 'saving', 'error', 'saving', 'saved']);
  });

  it('caps the retry wait', async () => {
    const save = vi.fn().mockRejectedValue(new Error('down'));
    const { saver } = build(save);
    edit('Chess');
    await saver.flush();
    for (let i = 0; i < 6; i += 1) await vi.advanceTimersByTimeAsync(DRAFT_AUTOSAVE_RETRY_MAX_MS);
    const calls = save.mock.calls.length;
    await vi.advanceTimersByTimeAsync(DRAFT_AUTOSAVE_RETRY_MAX_MS);
    expect(save.mock.calls.length).toBe(calls + 1);
  });

  it('clears the error when the form is put back to what the server holds', async () => {
    const save = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('down'));
    const { saver } = build(save);
    edit('Saved');
    await saver.flush();
    edit('Not saved');
    await saver.flush();
    expect(saver.status()).toBe('error');
    edit('Saved');
    saver.schedule();
    expect(saver.status()).toBe('saved');
    await vi.advanceTimersByTimeAsync(DRAFT_AUTOSAVE_RETRY_MAX_MS);
    expect(save).toHaveBeenCalledTimes(2);
  });

  it('sends nothing more once stopped (the pod was published)', async () => {
    const { saver, save } = build();
    edit('Published');
    saver.schedule();
    saver.stop();
    await vi.advanceTimersByTimeAsync(DRAFT_AUTOSAVE_DEBOUNCE_MS);
    expect(save).not.toHaveBeenCalled();
    expect(saver.hasUnsaved()).toBe(false);
    await expect(saver.flush()).resolves.toBe(true);
    saver.schedule();
    await vi.advanceTimersByTimeAsync(DRAFT_AUTOSAVE_DEBOUNCE_MS);
    expect(save).not.toHaveBeenCalled();
  });

  it('reports each time the form starts or stops differing from the last save', async () => {
    const unsaved: boolean[] = [];
    const saver = createDraftAutosaver({
      read: () => ({ ...form }),
      save: vi.fn().mockResolvedValue(undefined),
      onUnsaved: (value) => unsaved.push(value),
    });
    edit('Typed');
    saver.schedule();
    saver.schedule();
    expect(unsaved).toEqual([true]);
    await saver.flush();
    expect(unsaved).toEqual([true, false]);
    edit('Typed more');
    saver.schedule();
    edit('Typed');
    saver.schedule();
    expect(unsaved).toEqual([true, false, true, false]);
    edit('Published as is');
    saver.schedule();
    saver.markSaved();
    expect(unsaved).toEqual([true, false, true, false, true, false]);
    edit('After publish');
    saver.stop();
    saver.schedule();
    expect(unsaved.at(-1)).toBe(false);
  });

  it('flush on a form with nothing new sends nothing and says it is saved', async () => {
    const { saver, save } = build();
    await expect(saver.flush()).resolves.toBe(true);
    expect(save).not.toHaveBeenCalled();
  });
});
