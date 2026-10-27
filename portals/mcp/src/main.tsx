import { mountPortal } from '@duncit/shell';
import { flattenCatalogue, MCP_BUNDLE } from '@duncit/app-settings';
import { createSessionUserLoader } from '@duncit/user-context';
import { appConfig } from './config/app-config';
import { mcpLog } from './lib/logger';
import { graphqlUrl, runtime } from './runtime';
import App from './App';

/**
 * The MCP console, on mcp.duncit.com: connect Claude, ChatGPT, Gemini and the
 * coding agents to Duncit, approve them on the consent screen, and see every
 * tool call they make. Its copy is the `mcp` namespace.
 */
mountPortal({
  config: appConfig,
  apolloClient: runtime.apolloClient,
  graphqlUrl,
  logsPortal: mcpLog,
  i18nFallback: flattenCatalogue(MCP_BUNDLE),
  loadUser: createSessionUserLoader(runtime.apolloClient),
  children: <App />,
});
