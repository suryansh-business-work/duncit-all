import { z } from 'zod';
import { annotationsFor } from '../../catalog/annotations';
import type { ToolRisk } from '../../catalog/risk';
import { defineTool } from '../../tools/define';
import type { ToolAnnotationOverrides } from '../../tools/tool.types';
import { buildFixtureCatalog, toolNamed } from './fixtures';

const catalog = buildFixtureCatalog();
const tool = (name: string) => toolNamed(catalog, name);

const curated = (over: { risk?: ToolRisk; outward?: boolean; annotations?: ToolAnnotationOverrides } = {}) =>
  defineTool({
    name: 'mcp_probe',
    title: 'Probe',
    description: '[MCP · Read-only] A probe tool used by the annotation tests.',
    category: 'mcp',
    listedOn: ['*'],
    schema: z.object({}).strict(),
    run: async () => null,
    ...over,
  });

describe('annotationsFor', () => {
  it('marks a query read-only, idempotent and not destructive', () => {
    expect(annotationsFor(tool('pods_pods_table'))).toEqual({
      title: 'Pods table',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    });
  });

  it('marks an ordinary write as neither read-only nor destructive nor idempotent', () => {
    expect(annotationsFor(tool('pods_create_pod'))).toMatchObject({ readOnlyHint: false, destructiveHint: false, idempotentHint: false });
  });

  it('marks a destructive mutation destructive', () => {
    expect(annotationsFor(tool('pods_delete_pod'))).toMatchObject({ readOnlyHint: false, destructiveHint: true, idempotentHint: false });
  });

  it('sets openWorldHint when the mutation reaches people outside Duncit', () => {
    expect(annotationsFor(tool('pods_send_pod_reminder')).openWorldHint).toBe(true);
    expect(annotationsFor(tool('finance_refund_payment')).openWorldHint).toBe(true);
    expect(annotationsFor(tool('pods_join_free_pod')).openWorldHint).toBe(false);
  });

  it('uses the tool title as the annotation title', () => {
    expect(annotationsFor(tool('finance_approve_payment_release')).title).toBe('Approve payment release');
  });

  it('derives a curated tool’s annotations from its risk when it overrides nothing', () => {
    expect(annotationsFor(curated())).toEqual({ title: 'Probe', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false });
  });

  it('lets a curated tool override a misleading derived hint (mcp_call_tool is not read-only)', () => {
    expect(annotationsFor(tool('mcp_call_tool'))).toEqual({
      title: 'Call a tool',
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    });
  });

  it('overrides only the hints a curated tool names, keeping the rest derived', () => {
    const result = annotationsFor(curated({ risk: 'WRITE', annotations: { idempotentHint: true } }));
    expect(result).toEqual({ title: 'Probe', readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false });
  });

  it('reflects a curated tool that says it reaches outside Duncit', () => {
    expect(annotationsFor(curated({ outward: true })).openWorldHint).toBe(true);
  });

  it('marks the pod timing audit read-only — it reports and never fixes', () => {
    expect(annotationsFor(tool('pods_audit_timings'))).toMatchObject({ readOnlyHint: true, destructiveHint: false });
  });
});
