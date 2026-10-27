import mongoose from 'mongoose';
import { parse } from 'graphql';
import type { McpCategoryKey } from '../../catalog/categories';
import { ToolInputError } from '../../execute/validate';
import { META_CONFIRM, META_GUARD, META_REASON } from '../../mcp.constants';
import { runSelfTest, selfTestTool, type CheckResult } from '../../tools/meta/self-test.tool';
import type { McpTool } from '../../tools/tool.types';
import { buildFixtureCatalog, settings, toolContext, toolNamed } from './fixtures';

const catalog = buildFixtureCatalog();
const pod = toolNamed(catalog, 'pods_pod');
const join = toolNamed(catalog, 'pods_join_free_pod');
const remove = toolNamed(catalog, 'pods_delete_pod');
const whoami = toolNamed(catalog, 'mcp_whoami');

const checkOf = (results: CheckResult[], id: string): CheckResult => {
  const found = results.find((result) => result.id === id);
  if (!found) throw new Error(`no check ${id}`);
  return found;
};
const failuresOf = (tools: readonly McpTool[], id: string) => checkOf(runSelfTest(catalog, tools), id).failures;

/** The database check reads mongoose's connection state; pin it per test. */
let connectionState = 0;
beforeAll(() => {
  Object.defineProperty(mongoose.connection, 'readyState', { configurable: true, get: () => connectionState });
});
afterAll(() => {
  Reflect.deleteProperty(mongoose.connection, 'readyState');
});
beforeEach(() => {
  connectionState = mongoose.ConnectionStates.connected;
});

describe('runSelfTest', () => {
  it('passes every check on a well-formed catalog', () => {
    const results = runSelfTest(catalog, catalog.tools);
    expect(results.map((result) => [result.id, result.ok, result.checked])).toEqual([
      ['names', true, 22],
      ['descriptions', true, 22],
      ['parameters', true, 22],
      ['operations', true, 13],
      ['served', true, 22],
    ]);
    expect(results.every((result) => result.failures.length === 0)).toBe(true);
  });

  it('catches an invalid tool name and a name used twice', () => {
    expect(failuresOf([{ ...pod, name: 'Pods-Bad' }, pod, pod], 'names')).toEqual(['Pods-Bad: not a valid MCP tool name', 'pods_pod: used twice']);
  });

  it('catches a description too short to choose a tool by (under 20 characters)', () => {
    expect(failuresOf([{ ...pod, description: '  Reads one pod.   ' }], 'descriptions')).toEqual(['pods_pod: description too short']);
    expect(failuresOf([{ ...pod, description: 'Reads one pod by id.' }], 'descriptions')).toEqual([]);
  });

  it('catches parameters that are not a closed object', () => {
    expect(failuresOf([{ ...pod, inputSchema: { ...pod.inputSchema, additionalProperties: true } }], 'parameters')).toEqual([
      'pods_pod: parameters are not a closed object',
    ]);
  });

  it('catches a tool missing the meta parameters', () => {
    const properties = { ...pod.inputSchema.properties };
    delete properties[META_GUARD];
    expect(failuresOf([{ ...pod, inputSchema: { ...pod.inputSchema, properties } }], 'parameters')).toEqual(['pods_pod: meta parameters missing']);
  });

  it('catches a writing tool that does not require a reason', () => {
    expect(failuresOf([{ ...join, inputSchema: { ...join.inputSchema, required: ['pod_id'] } }], 'parameters')).toEqual([
      `pods_join_free_pod: writes but does not require ${META_REASON}`,
    ]);
  });

  it('catches a confirm-tool that does not require mcp_confirm', () => {
    expect(failuresOf([{ ...remove, inputSchema: { ...remove.inputSchema, required: ['id', META_REASON] } }], 'parameters')).toEqual([
      `pods_delete_pod: needs confirmation but does not require ${META_CONFIRM}`,
    ]);
  });

  it('catches an API operation the live schema would reject', () => {
    const broken = { ...pod, name: 'pods_broken', document: parse('query Mcp_broken { noSuchField }') } as McpTool;
    expect(failuresOf([broken], 'operations')).toEqual(['pods_broken: Cannot query field "noSuchField" on type "Query".']);
  });

  it('catches an API tool whose category no connector serves, but not a curated one', () => {
    const lost = { ...pod, category: 'nowhere' as McpCategoryKey };
    const curated = { ...whoami, category: 'nowhere' as McpCategoryKey };
    expect(failuresOf([lost, curated], 'served')).toEqual(['pods_pod: category nowhere is on no connector']);
  });

  it('lists at most 25 failures but counts every tool checked', () => {
    const bad = Array.from({ length: 30 }, (_, i) => ({ ...pod, name: `Bad-${i}` }));
    const names = checkOf(runSelfTest(catalog, bad), 'names');
    expect(names).toMatchObject({ ok: false, checked: 30 });
    expect(names.failures).toHaveLength(25);
  });
});

describe('mcp_self_test', () => {
  type Report = { ok: boolean; passed: number; failed: number; tools_tested: number; checks: CheckResult[] };
  const selfTest = async (args: Record<string, unknown> = {}, options: Parameters<typeof toolContext>[0] = {}) =>
    (await selfTestTool.run(toolContext({ catalog, ...options }), args)) as Report;

  it('is read-only and listed everywhere', () => {
    expect(selfTestTool).toMatchObject({ risk: 'READ', confirm: false, listedOn: ['*'] });
  });

  it('passes all seven checks on a healthy server', async () => {
    const report = await selfTest();
    expect(report).toMatchObject({ ok: true, passed: 7, failed: 0, tools_tested: 22 });
    expect(report.checks.map((check) => check.id)).toEqual(['names', 'descriptions', 'parameters', 'operations', 'served', 'settings', 'database']);
  });

  it('tests only one category when asked', async () => {
    const report = await selfTest({ category: 'finance' });
    expect(report.tools_tested).toBe(3);
    expect(checkOf(report.checks, 'operations').checked).toBe(3);
  });

  it('flags a switched-off tool that does not exist', async () => {
    const report = await selfTest({}, { settings: settings({ disabled_tools: ['pods_pod', 'pods_gone'] }) });
    expect(checkOf(report.checks, 'settings')).toEqual({
      id: 'settings',
      label: 'Switched-off tools in the settings all exist',
      ok: false,
      checked: 2,
      failures: ['pods_gone: no such tool'],
    });
    expect(report).toMatchObject({ ok: false, passed: 6, failed: 1 });
  });

  it('fails the database check when MongoDB is not connected', async () => {
    connectionState = mongoose.ConnectionStates.disconnected;
    const report = await selfTest();
    expect(checkOf(report.checks, 'database')).toMatchObject({ ok: false, failures: ['MongoDB is not connected'] });
    expect(report.ok).toBe(false);
  });

  it('treats a connection still opening as not connected', async () => {
    connectionState = mongoose.ConnectionStates.connecting;
    expect(checkOf((await selfTest()).checks, 'database').ok).toBe(false);
  });

  it('refuses an unknown category or argument', async () => {
    await expect(selfTest({ category: 'nope' })).rejects.toBeInstanceOf(ToolInputError);
    await expect(selfTest({ fix: true })).rejects.toBeInstanceOf(ToolInputError);
  });
});
