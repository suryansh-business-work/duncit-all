import { META_CONFIRM, META_GUARD, META_REASON, REASON_MAX_LENGTH, REASON_MIN_LENGTH } from '../../mcp.constants';
import type { JsonSchema } from '../../catalog/json-schema';
import { withMetaParams } from '../../catalog/meta-params';

const own: JsonSchema = {
  type: 'object',
  properties: { pod_id: { type: 'string' }, note: { type: 'string' } },
  required: ['pod_id'],
  additionalProperties: false,
  description: 'Join a pod.',
};

describe('withMetaParams', () => {
  it('adds mcp_reason and mcp_guard to every tool, read-only ones included', () => {
    const schema = withMetaParams(own, 'READ', false);
    expect(Object.keys(schema.properties)).toEqual(['pod_id', 'note', META_REASON, META_GUARD]);
  });

  it('bounds the reason by the same limits the validator enforces', () => {
    const reason = withMetaParams(own, 'READ', false).properties[META_REASON];
    expect(reason).toMatchObject({ type: 'string', minLength: REASON_MIN_LENGTH, maxLength: REASON_MAX_LENGTH });
  });

  it('offers exactly the two guard modes', () => {
    expect(withMetaParams(own, 'READ', false).properties[META_GUARD]).toMatchObject({ type: 'string', enum: ['block', 'warn'] });
  });

  it('does not require a reason for a read and says nothing about it being required', () => {
    const schema = withMetaParams(own, 'READ', false);
    expect(schema.required).toEqual(['pod_id']);
    expect(schema.properties[META_REASON].description).not.toContain('Required.');
  });

  it.each(['WRITE', 'DESTRUCTIVE'] as const)('requires a reason for a %s tool and says so', (risk) => {
    const schema = withMetaParams(own, risk, false);
    expect(schema.required).toEqual(['pod_id', META_REASON]);
    expect(schema.properties[META_REASON].description).toMatch(/Required\.$/);
  });

  it('adds mcp_confirm (const true) and requires it only on tools that need confirmation', () => {
    const confirmed = withMetaParams(own, 'DESTRUCTIVE', true);
    expect(confirmed.properties[META_CONFIRM]).toMatchObject({ type: 'boolean', const: true });
    expect(confirmed.required).toEqual(['pod_id', META_REASON, META_CONFIRM]);
    expect(withMetaParams(own, 'WRITE', false).properties[META_CONFIRM]).toBeUndefined();
  });

  it('always closes the object, even when the source schema was open', () => {
    const schema = withMetaParams({ type: 'object', properties: {}, additionalProperties: true }, 'READ', false);
    expect(schema.additionalProperties).toBe(false);
    expect(schema.type).toBe('object');
  });

  it('leaves `required` out entirely when nothing is required', () => {
    const schema = withMetaParams({ type: 'object', properties: { q: { type: 'string' } } }, 'READ', false);
    expect(schema).not.toHaveProperty('required');
  });

  it('copes with a source schema that has no properties at all', () => {
    const schema = withMetaParams({ type: 'object' }, 'WRITE', false);
    expect(Object.keys(schema.properties)).toEqual([META_REASON, META_GUARD]);
    expect(schema.required).toEqual([META_REASON]);
  });

  it('keeps the source description and does not mutate the source schema', () => {
    const before = JSON.stringify(own);
    const schema = withMetaParams(own, 'DESTRUCTIVE', true);
    expect(schema.description).toBe('Join a pod.');
    expect(JSON.stringify(own)).toBe(before);
  });
});
