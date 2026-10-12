import { describe, expect, it } from 'vitest';
import { editableSnapshot, sampleVarsJson } from '../../src/pages/email-templates-page/template-draft';
import { makeTpl } from '../mocks/email-template.mock';

describe('editableSnapshot', () => {
  it('keeps only what an update sends, so a server-rewritten field never reads as an edit', () => {
    const tpl = makeTpl({
      description: 'Welcome mail',
      fragment_key: 'transactional',
      footer_note: 'You joined a pod',
      variables: [{ key: 'name', description: 'First name', sample: 'Ana' }],
      updated_at: '2026-10-01T00:00:00.000Z',
    } as never);
    const snap = editableSnapshot(tpl);
    expect(snap).toEqual({
      name: 'Welcome',
      description: 'Welcome mail',
      subject: 'Hi',
      mjml: '<mjml></mjml>',
      fragment_key: 'transactional',
      footer_note: 'You joined a pod',
      variables: [{ key: 'name', description: 'First name', sample: 'Ana' }],
      is_active: true,
    });
    expect(snap).not.toHaveProperty('updated_at');
  });

  it('normalises absent optional fields to the values the server stores', () => {
    const snap = editableSnapshot(
      makeTpl({
        description: undefined,
        fragment_key: undefined,
        footer_note: undefined,
        variables: [{ key: 'code' }],
      } as never),
    );
    expect(snap.description).toBe('');
    expect(snap.fragment_key).toBeNull();
    expect(snap.footer_note).toBe('');
    expect(snap.variables).toEqual([{ key: 'code', description: '', sample: '' }]);
  });
});

describe('sampleVarsJson', () => {
  it('prefers a declared sample and falls back to the placeholder itself', () => {
    const json = sampleVarsJson(makeTpl({ variables: [{ key: 'name', sample: 'Ana' }, { key: 'code' }] }));
    expect(JSON.parse(json)).toEqual({ name: 'Ana', code: '{{code}}' });
  });
});
