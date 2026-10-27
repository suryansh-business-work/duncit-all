import { ForwardedFailure } from '../../execute/pipeline';
import { ToolInputError } from '../../execute/validate';
import { GATEWAY_ENDPOINT, META_REASON } from '../../mcp.constants';
import { callToolTool } from '../../tools/meta/call.tool';
import { toolContext } from './fixtures';

const gateway = () => toolContext({ endpoint: GATEWAY_ENDPOINT });

describe('mcp_call_tool', () => {
  it('is listed on the gateway only and does not claim to be read-only', () => {
    expect(callToolTool.listedOn).toEqual([GATEWAY_ENDPOINT]);
    expect(callToolTool.annotations).toEqual({ readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true });
  });

  it('requires the tool name and nothing else of its own', () => {
    expect(callToolTool.inputSchema.required).toEqual(['name']);
    expect(Object.keys(callToolTool.inputSchema.properties)).toEqual(expect.arrayContaining(['name', 'arguments']));
  });

  it('runs the named tool through the pipeline and returns its data', async () => {
    const context = gateway();
    context.callTool.mockResolvedValue({ ok: true, data: { id: 'p1' } });
    await expect(callToolTool.run(context, { name: 'pods_pod', arguments: { id: 'p1' } })).resolves.toEqual({ id: 'p1' });
    expect(context.callTool).toHaveBeenCalledWith('pods_pod', { id: 'p1' });
  });

  it('hands the inner tool its meta parameters untouched, so its own rules apply', async () => {
    const context = gateway();
    context.callTool.mockResolvedValue({ ok: true, data: true });
    await callToolTool.run(context, { name: 'pods_join_free_pod', arguments: { pod_id: 'p1', [META_REASON]: 'The member asked to join.' } });
    expect(context.callTool).toHaveBeenCalledWith('pods_join_free_pod', { pod_id: 'p1', [META_REASON]: 'The member asked to join.' });
  });

  it('calls with no arguments when "arguments" is left out', async () => {
    const context = gateway();
    context.callTool.mockResolvedValue({ ok: true, data: [] });
    await callToolTool.run(context, { name: 'mcp_whoami' });
    expect(context.callTool).toHaveBeenCalledWith('mcp_whoami', {});
  });

  it('trims the tool name', async () => {
    const context = gateway();
    context.callTool.mockResolvedValue({ ok: true, data: null });
    await callToolTool.run(context, { name: '  pods_pod ', arguments: {} });
    expect(context.callTool).toHaveBeenCalledWith('pods_pod', {});
  });

  it('passes a null result through as null', async () => {
    const context = gateway();
    context.callTool.mockResolvedValue({ ok: true, data: null });
    await expect(callToolTool.run(context, { name: 'pods_pod', arguments: {} })).resolves.toBeNull();
  });

  it('re-throws the inner tool’s own failure as a ForwardedFailure with its code and message', async () => {
    const context = gateway();
    context.callTool.mockResolvedValue({ ok: false, error: { code: 'CONFIRMATION_REQUIRED', message: 'Delete pod needs the user’s explicit OK.' } });
    const error = await callToolTool.run(context, { name: 'pods_delete_pod', arguments: {} }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ForwardedFailure);
    expect(error).toMatchObject({ code: 'CONFIRMATION_REQUIRED', message: 'Delete pod needs the user’s explicit OK.' });
  });

  it('still fails clearly when the inner outcome carries no error object', async () => {
    const context = gateway();
    context.callTool.mockResolvedValue({ ok: false });
    const error = await callToolTool.run(context, { name: 'pods_pod', arguments: {} }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ForwardedFailure);
    expect(error).toMatchObject({ code: 'ERROR', message: 'pods_pod failed.' });
  });

  it.each([[{}], [{ name: '' }], [{ name: 'x'.repeat(65) }], [{ name: 'pods_pod', arguments: [] }], [{ name: 'pods_pod', arguments: 'id=1' }], [{ name: 'pods_pod', extra: 1 }]])(
    'refuses invalid arguments %j without calling anything',
    async (args) => {
      const context = gateway();
      await expect(callToolTool.run(context, args)).rejects.toBeInstanceOf(ToolInputError);
      expect(context.callTool).not.toHaveBeenCalled();
    }
  );
});
