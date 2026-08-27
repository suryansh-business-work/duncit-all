/**
 * Before tiptap has produced an editor instance (a first server-side pass, or a
 * hook configured not to render immediately) the input renders nothing rather
 * than an empty frame — a caller sees the same box appear once, not a border
 * that later grows a toolbar. Mocked at the hook because that state is not
 * reachable through props.
 */
import { describe, expect, it, vi } from 'vitest';

import { DuncitRichTextInput } from '../src/DuncitRichTextInput';
import { mount } from './harness';

vi.mock('@tiptap/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tiptap/react')>()),
  useEditor: () => null,
}));

describe('DuncitRichTextInput without an editor instance', () => {
  it('renders nothing at all', async () => {
    const onChange = vi.fn();
    const host = await mount(<DuncitRichTextInput value="<p>Doubles at Court 2.</p>" onChange={onChange} />);

    expect(host.innerHTML).toBe('');
    expect(onChange).not.toHaveBeenCalled();
  });
});
