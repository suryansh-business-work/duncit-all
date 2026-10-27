import { describe, expect, it, vi } from 'vitest';
import { makeRenderLastRun } from '../../src/pages/settings-cells';
import { mount } from '../dom';

interface Row {
  status: string | null;
  at: string | null;
  detail?: string | null;
}

const labels = {
  status: { SENT: 'Sent' },
  colors: { SENT: 'success', FAILED: 'error' } as const,
  never: 'Never',
  formatWhen: (iso: string) => `at ${iso}`,
};
const render = makeRenderLastRun<Row>((row) => row, labels);

describe('makeRenderLastRun', () => {
  it('says "never" for a run with no time or no status', async () => {
    await mount(render({ status: null, at: null }));
    await mount(render({ status: 'SENT', at: null }));
    await mount(render({ status: null, at: '2026-10-01T10:00:00Z' }));
    expect(document.body.textContent).toBe('NeverNeverNever');
  });

  it('shows the status chip in its own words, with when it ran', async () => {
    await mount(render({ status: 'SENT', at: '2026-10-01T10:00:00Z' }));
    expect(document.body.textContent).toBe('Sentat 2026-10-01T10:00:00Z');
    expect(document.querySelector('.MuiChip-colorSuccess')).not.toBeNull();
  });

  it('shows the raw status when the labels have no words for it', async () => {
    await mount(render({ status: 'FAILED', at: '2026-10-01T10:00:00Z' }));
    expect(document.body.textContent).toContain('FAILED');
    expect(document.querySelector('.MuiChip-colorError')).not.toBeNull();
  });

  it('explains the run on hover when there is something to explain, and not otherwise', async () => {
    const formatWhen = vi.fn((iso: string) => iso);
    const explained = makeRenderLastRun<Row>((row) => row, { ...labels, formatWhen });
    await mount(explained({ status: 'FAILED', at: 'T1', detail: 'SMTP refused' }));
    expect(document.querySelector('[aria-label="SMTP refused"]')).not.toBeNull();
    document.body.replaceChildren();
    await mount(explained({ status: 'FAILED', at: 'T2', detail: null }));
    expect(document.querySelector('[aria-label]')).toBeNull();
    expect(formatWhen).toHaveBeenCalledWith('T2');
  });
});
