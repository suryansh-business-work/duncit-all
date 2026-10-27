import { z } from 'zod';
import { META_CONFIRM, META_GUARD, META_REASON } from '../../mcp.constants';
import { ToolInputError } from '../../execute/validate';
import { defineTool, issuesText, jsonSchemaOf } from '../../tools/define';
import { toolContext } from './fixtures';

const schema = z
  .object({
    pod_id: z.string().min(1).describe('The pod.'),
    page: z.number().int().min(1).default(1),
    note: z.string().max(5).optional(),
  })
  .strict();

const run = jest.fn();
const spec = {
  name: 'pods_probe',
  title: 'Probe pods',
  description: '[Pods · Read-only] A probe tool for the define tests.',
  category: 'pods' as const,
  listedOn: ['pods'],
  schema,
  run,
};

beforeEach(() => run.mockReset().mockResolvedValue('done'));

describe('jsonSchemaOf', () => {
  it('drops the $schema dialect URI', () => {
    expect(jsonSchemaOf(schema)).not.toHaveProperty('$schema');
  });

  it('keeps defaulted fields optional (input view) and required fields required', () => {
    const json = jsonSchemaOf(schema);
    expect(json.required).toEqual(['pod_id']);
    expect(json.properties?.page).toMatchObject({ type: 'integer', minimum: 1, default: 1 });
  });

  it('closes a strict object and carries descriptions', () => {
    const json = jsonSchemaOf(schema);
    expect(json.additionalProperties).toBe(false);
    expect(json.properties?.pod_id).toMatchObject({ type: 'string', minLength: 1, description: 'The pod.' });
  });
});

describe('issuesText', () => {
  it('prefixes each issue with its path and joins them', () => {
    const result = schema.safeParse({ pod_id: '', note: 'too long' });
    if (result.success) throw new Error('expected a failure');
    const text = issuesText(result.error);
    expect(text.split('; ')).toHaveLength(2);
    expect(text).toMatch(/^pod_id: /);
    expect(text).toMatch(/; note: /);
  });

  it('leaves an issue at the root unprefixed', () => {
    const result = z.object({}).strict().safeParse({ extra: 1 });
    if (result.success) throw new Error('expected a failure');
    const [issue] = result.error.issues;
    expect(issue.path).toEqual([]);
    expect(issuesText(result.error)).toBe(issue.message);
    expect(issue.message).toContain('extra');
  });
});

describe('defineTool', () => {
  it('defaults to a read-only tool that needs no confirmation and stays inside Duncit', () => {
    const tool = defineTool(spec);
    expect(tool).toMatchObject({ source: 'curated', kind: 'CURATED', risk: 'READ', confirm: false, outward: false, listedOn: ['pods'], category: 'pods' });
    expect(tool.annotations).toBeUndefined();
  });

  it('shows the zod schema plus the meta parameters', () => {
    const tool = defineTool(spec);
    expect(Object.keys(tool.inputSchema.properties)).toEqual(['pod_id', 'page', 'note', META_REASON, META_GUARD]);
    expect(tool.inputSchema.required).toEqual(['pod_id']);
  });

  it('requires a reason and a confirmation when the spec says it writes and needs a yes', () => {
    const tool = defineTool({ ...spec, risk: 'DESTRUCTIVE', confirm: true, outward: true, annotations: { idempotentHint: true } });
    expect(tool).toMatchObject({ risk: 'DESTRUCTIVE', confirm: true, outward: true, annotations: { idempotentHint: true } });
    expect(tool.inputSchema.required).toEqual(['pod_id', META_REASON, META_CONFIRM]);
  });

  it('runs with the parsed arguments, defaults filled in', async () => {
    const tool = defineTool(spec);
    const context = toolContext();
    await expect(tool.run(context, { pod_id: 'p1' })).resolves.toBe('done');
    expect(run).toHaveBeenCalledWith(context, { pod_id: 'p1', page: 1 });
  });

  it('refuses arguments the schema rejects, before its own code runs', async () => {
    const tool = defineTool(spec);
    const error = await tool.run(toolContext(), { pod_id: 'p1', page: 0 }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ToolInputError);
    expect(error).toMatchObject({ code: 'INVALID_ARGUMENTS', message: expect.stringMatching(/^page: /) });
    expect(run).not.toHaveBeenCalled();
  });

  it('refuses an argument the strict schema does not know', async () => {
    const tool = defineTool(spec);
    await expect(tool.run(toolContext(), { pod_id: 'p1', extra: true })).rejects.toBeInstanceOf(ToolInputError);
  });

  it('passes on whatever its own code throws', async () => {
    run.mockRejectedValue(new Error('boom'));
    await expect(defineTool(spec).run(toolContext(), { pod_id: 'p1' })).rejects.toThrow('boom');
  });
});
