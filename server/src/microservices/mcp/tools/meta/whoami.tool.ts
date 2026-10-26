import { z } from 'zod';
import { accessibleEndpoints, findEndpoint } from '../../catalog/endpoints';
import { listTools } from '../../catalog/visibility';
import { GATEWAY_ENDPOINT, SCOPE_WRITE } from '../../mcp.constants';
import { defineTool } from '../define';
import { connectorUrl, viewerOf } from './shared';

/** mcp_whoami — who the AI is acting as, what this connection may do, and every connector URL. */
export const whoamiTool = defineTool({
  name: 'mcp_whoami',
  title: 'Who am I',
  description:
    '[MCP · Read-only] Who this connection acts as (account, roles), what it may do (read-only or read & write), the connector you are on, and every Duncit MCP connector URL this account can open with its tool count. Call it first when unsure what you can do.',
  category: 'mcp',
  listedOn: ['*'],
  schema: z.object({}).strict(),
  async run(context) {
    const viewer = viewerOf(context);
    const canWrite = context.scopes.includes(SCOPE_WRITE) && context.settings.write_tools_enabled;
    return {
      user: { id: context.user.id, email: context.user.email ?? null, roles: context.user.roles },
      connection: {
        app: context.connection.clientName,
        scopes: context.scopes,
        can_write: canWrite,
        writes_note: canWrite
          ? 'Tools that change data are available. Each needs mcp_reason; risky ones also need the user to confirm (mcp_confirm).'
          : 'This connection can only read. Reconnect and allow changes if the user wants you to make changes.',
      },
      this_connector: {
        key: context.endpoint,
        label: findEndpoint(context.endpoint)?.label ?? 'Gateway (all your consoles)',
        url: connectorUrl(context.publicUrl, context.endpoint),
      },
      gateway_url: connectorUrl(context.publicUrl, GATEWAY_ENDPOINT),
      connectors: accessibleEndpoints(context.user.roles).map((endpoint) => ({
        key: endpoint.key,
        label: endpoint.label,
        url: connectorUrl(context.publicUrl, endpoint.key),
        tools: listTools(context.catalog, endpoint.key, viewer).length,
      })),
    };
  },
});
