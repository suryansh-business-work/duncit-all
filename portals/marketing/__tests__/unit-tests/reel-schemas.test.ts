import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Translate } from '@duncit/shell';
import { buildReelChatSchema, reelChatInitialValues } from '../../src/forms/reel-chat';
import { buildReelProjectSchema, reelProjectInitialValues } from '../../src/forms/reel-project';
import { buildReelPromptSchema } from '../../src/forms/reel-prompt';
import { MAX_REQUEST_LENGTH } from '../../src/pages/reels/types';

/** The key itself, so a test can say which message a refusal carried. */
const t = ((key: string) => key) as unknown as Translate;

const FOLDER_ID = '1AbCdEfGhIjKlMnOp';

/** The first message a schema refuses `value` with, or null when it accepts it. */
function refusal(schema: { safeParse: (value: unknown) => { success: boolean; error?: { issues: Array<{ message: string }> } } }, value: unknown) {
  const result = schema.safeParse(value);
  return result.success ? null : (result.error?.issues[0].message ?? '');
}

describe('reel project schema', () => {
  const schema = buildReelProjectSchema(t);

  it('starts empty, which is not yet a reel', () => {
    expect(refusal(schema, reelProjectInitialValues)).toBe('ai.reels.form.nameRequired');
  });

  it('needs a name of at most 80 characters', () => {
    expect(refusal(schema, { name: '   ', drive_url: '' })).toBe('ai.reels.form.nameRequired');
    expect(refusal(schema, { name: 'x'.repeat(81), drive_url: '' })).toBe('ai.reels.form.nameMax');
    expect(refusal(schema, { name: 'Jam night recap', drive_url: '' })).toBeNull();
  });

  it.each([
    `https://drive.google.com/drive/folders/${FOLDER_ID}`,
    `https://drive.google.com/drive/folders/${FOLDER_ID}?usp=sharing`,
    `https://drive.google.com/open?id=${FOLDER_ID}`,
    `https://google.com/folders/${FOLDER_ID}`,
  ])('accepts the Drive folder link %s', (drive_url) => {
    expect(refusal(schema, { name: 'Recap', drive_url })).toBeNull();
  });

  it.each([
    'jam night folder',
    `http://drive.google.com/drive/folders/${FOLDER_ID}`,
    `https://example.com/drive/folders/${FOLDER_ID}`,
    `https://notgoogle.com/drive/folders/${FOLDER_ID}`,
    'https://drive.google.com/drive/my-drive',
    'https://drive.google.com/open?id=short',
  ])('refuses %s as a Drive folder link', (drive_url) => {
    expect(refusal(schema, { name: 'Recap', drive_url })).toBe('ai.reels.form.driveUrlInvalid');
  });

  it('refuses a link longer than 500 characters', () => {
    const drive_url = `https://drive.google.com/drive/folders/${FOLDER_ID}?x=${'y'.repeat(500)}`;
    expect(refusal(schema, { name: 'Recap', drive_url })).toBe('ai.reels.form.driveUrlMax');
  });
});

describe('reel chat schema', () => {
  const schema = buildReelChatSchema(t);

  it('needs something to send, and no more than the editor will read', () => {
    expect(refusal(schema, reelChatInitialValues)).toBe('ai.reels.chat.textRequired');
    expect(refusal(schema, { text: 'x'.repeat(MAX_REQUEST_LENGTH + 1) })).toBe('ai.reels.chat.textMax');
    expect(refusal(schema, { text: ' open on the drums ' })).toBeNull();
  });
});

describe('reel prompt schema', () => {
  const schema = buildReelPromptSchema(t);

  it('needs a name and the words to save', () => {
    expect(refusal(schema, { name: '', content: 'cut a teaser' })).toBe('ai.reels.prompts.nameRequired');
    expect(refusal(schema, { name: 'x'.repeat(81), content: 'cut a teaser' })).toBe('ai.reels.prompts.nameMax');
    expect(refusal(schema, { name: 'Teaser', content: '  ' })).toBe('ai.reels.prompts.contentRequired');
    expect(refusal(schema, { name: 'Teaser', content: 'x'.repeat(MAX_REQUEST_LENGTH + 1) })).toBe('ai.reels.prompts.contentMax');
    expect(refusal(schema, { name: 'Teaser', content: 'cut a 15 second teaser' })).toBeNull();
  });
});

describe('remotionLicenseKey', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('is null while the build carries no licence', async () => {
    const unset = await import('../../src/pages/reels/license');
    expect(unset.remotionLicenseKey).toBeNull();

    vi.stubEnv('VITE_REMOTION_LICENSE_KEY', '   ');
    vi.resetModules();
    const { remotionLicenseKey } = await import('../../src/pages/reels/license');
    expect(remotionLicenseKey).toBeNull();
  });

  it('is the key the build was given', async () => {
    vi.stubEnv('VITE_REMOTION_LICENSE_KEY', ' rm_pub_duncit ');
    vi.resetModules();
    const { remotionLicenseKey } = await import('../../src/pages/reels/license');
    expect(remotionLicenseKey).toBe('rm_pub_duncit');
  });
});
