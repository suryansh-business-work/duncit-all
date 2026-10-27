/**
 * Runs the official MCP conformance suite (github.com/modelcontextprotocol/conformance)
 * against Duncit's MCP protocol layer.
 *
 *   pnpm --filter server mcp:conformance
 *
 * Boots an in-memory MongoDB, the real GraphQL schema and the PRODUCTION MCP
 * handler (`createMcpHandler(mcpServerFactory)` — the same factory the
 * connectors serve), with a session for a seeded super admin already attached:
 * the suite has no way to complete an OAuth sign-in, and OAuth is covered by
 * the integration tests. Then it runs every server scenario that applies to a
 * real server — the rest assert the suite's own reference tools
 * (`test_simple_text`, `json_schema_2020_12_tool`, …) or a localhost-only
 * server, neither of which Duncit is.
 *
 * Exits 1 if any scenario reports a failure.
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ApolloServer } from '@apollo/server';
import { createMcpHandler } from '@modelcontextprotocol/server';
import { toNodeHandler } from '@modelcontextprotocol/node';

const SUITE = '@modelcontextprotocol/conformance@0.1.16';
const SCENARIOS = ['server-initialize', 'ping', 'tools-list', 'prompts-list'];
const PASSED = /Passed: (\d+)\/(\d+), 0 failed/;
const SCENARIO_TIMEOUT_MS = 120_000;

/**
 * One suite run, asynchronously — the MCP server answering it lives in this
 * same process, so a blocking spawn would leave every request unanswered.
 */
function runScenario(url: string, scenario: string): Promise<string> {
  return new Promise((resolve) => {
    const child = spawn('npx', ['-y', SUITE, 'server', '--url', url, '--scenario', scenario], {
      shell: process.platform === 'win32',
    });
    let output = '';
    child.stdout.on('data', (chunk: Buffer) => (output += chunk.toString()));
    child.stderr.on('data', (chunk: Buffer) => (output += chunk.toString()));
    const timer = setTimeout(() => child.kill(), SCENARIO_TIMEOUT_MS);
    child.on('close', () => {
      clearTimeout(timer);
      resolve(output);
    });
  });
}

async function main(): Promise<number> {
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  const { typeDefs, typeDefsByModule, resolvers } = await import('../src/modules');
  const { registerCatalogSource, getCatalog } = await import('../src/microservices/mcp/catalog/catalog');
  const { mcpServerFactory } = await import('../src/microservices/mcp/server/mcp.server');
  const { mcpSettingsService } = await import('../src/microservices/mcp/settings/settings.service');
  const { UserModel } = await import('../src/modules/access/user/user.model');

  const apollo = new ApolloServer({ typeDefs, resolvers });
  await apollo.start();
  registerCatalogSource({ typeDefsByModule, resolvers });
  const admin = await UserModel.create({
    auth: { email: 'conformance@duncit.com' },
    profile: { first_name: 'Conformance', last_name: 'Suite' },
    metadata: { role_keys: ['SUPER_ADMIN'] },
  });
  const user = { id: String(admin._id), email: 'conformance@duncit.com', roles: ['SUPER_ADMIN'] };
  const scopes = ['mcp:read', 'mcp:write'];

  const app = express();
  const serve = toNodeHandler(createMcpHandler(mcpServerFactory, { legacy: 'stateless' }));
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as { port: number };
  const publicUrl = `http://127.0.0.1:${port}`;

  app.all('/mcp', express.json(), async (req, res) => {
    req.auth = {
      token: 'conformance',
      clientId: 'conformance',
      scopes,
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      extra: {
        session: {
          caller: { apollo, user, req, res, isClientGone: () => false },
          endpoint: 'pods',
          scopes,
          connection: { id: '000000000000000000000000', clientName: 'MCP conformance suite' },
          publicUrl,
          catalog: getCatalog(),
          settings: await mcpSettingsService.get(),
          meta: { ip: '127.0.0.1', userAgent: 'mcp-conformance' },
        },
      },
    };
    await serve(req, res, req.body);
  });

  const failures: string[] = [];
  for (const scenario of SCENARIOS) {
    // The suite is run, not installed: its pinned version is the contract.
    const output = await runScenario(`${publicUrl}/mcp`, scenario);
    const match = PASSED.exec(output);
    const ok = Boolean(match && match[1] === match[2]);
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${scenario}${match ? `  (${match[1]}/${match[2]} checks)` : ''}`);
    if (!ok) {
      failures.push(scenario);
      console.log(output.split('\n').slice(-40).join('\n'));
    }
  }

  await apollo.stop();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await mongoose.disconnect();
  await mongod.stop();
  console.log(failures.length ? `\n${failures.length} scenario(s) failed: ${failures.join(', ')}` : '\nAll conformance scenarios passed.');
  return failures.length ? 1 : 0;
}

main()
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
