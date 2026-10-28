/**
 * The two optional actions a surface on another API turns off.
 *
 * Improve with AI and Insert picture both call the main Duncit API. Duncit Lite
 * has its own API, so it mounts the editor with `aiImprove={false}` and
 * `images={false}`: the formatting toolbar stays, the two actions are gone, and
 * the empty actions bar does not hang under the editor.
 */
import { describe, expect, it, vi } from 'vitest';

import { DuncitRichTextInput } from '../src/DuncitRichTextInput';
import { RichTextActions } from '../src/RichTextActions';
import { buttonNamed, mount } from './harness';

const AUTHORED = '<p>We keep your data for as long as your account is open.</p>';

describe('DuncitRichTextInput · optional actions', () => {
  it('offers Improve with AI and Insert picture by default', async () => {
    const host = await mount(<DuncitRichTextInput value={AUTHORED} onChange={vi.fn()} />);

    expect(buttonNamed(host, 'Improve with AI')).not.toBeNull();
    expect(buttonNamed(host, 'Insert picture')).not.toBeNull();
  });

  it('keeps the formatting toolbar but drops both actions when turned off', async () => {
    const host = await mount(<DuncitRichTextInput value={AUTHORED} onChange={vi.fn()} aiImprove={false} images={false} />);

    expect(host.querySelector('[role="toolbar"]')).not.toBeNull();
    expect(buttonNamed(host, 'Bold')).not.toBeNull();
    expect(buttonNamed(host, 'Improve with AI')).toBeNull();
    expect(buttonNamed(host, 'Insert picture')).toBeNull();
    expect(host.textContent).toContain('We keep your data');
  });
});

describe('RichTextActions without Improve', () => {
  it('draws nothing while there is nothing to report', async () => {
    const host = await mount(<RichTextActions disabled={false} error={false} loading={false} improve={false} onImprove={vi.fn()} />);

    expect(host.childElementCount).toBe(0);
  });

  it('still reports a failed picture, with no Improve button beside it', async () => {
    const host = await mount(<RichTextActions disabled={false} error={false} imageError loading={false} improve={false} onImprove={vi.fn()} />);

    expect(host.querySelector('[role="alert"]')?.textContent).toBe('That picture could not be uploaded. Please try again.');
    expect(buttonNamed(host, 'Improve with AI')).toBeNull();
  });
});
