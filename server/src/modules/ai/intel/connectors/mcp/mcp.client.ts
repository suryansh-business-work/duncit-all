import { ProviderError } from '../intel.http';
import { assertPublicResolution, parseServerUrl } from './mcp.ssrf';
import type { McpToolAnnotations } from './mcp.classify';

/**
 * A minimal MCP client over Streamable HTTP (JSON-RPC 2.0): initialize,
 * tools/list and tools/call. Responses may come back as JSON or as an SSE
 * stream; both are read. One session per call sequence, never cached between
 * people. No SDK dependency — three methods do not need one.
 */

const PROTOCOL = '2025-06-18';
const TIMEOUT_MS = 30_000;

export interface McpServerConfig {
  url: string;
  token: string;
  headerName?: string;
  allowedHosts: readonly string[];
}

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  annotations?: McpToolAnnotations;
}

interface RpcResponse {
  id?: number | string;
  result?: unknown;
  error?: { code: number; message: string };
}

function readSse(text: string, id: number): RpcResponse | null {
  for (const block of text.split(/\r?\n\r?\n/)) {
    const data = block
      .split(/\r?\n/)
      .filter((l) => l.startsWith('data:'))
      .map((l) => l.slice(5).trim())
      .join('');
    if (!data) continue;
    try {
      const msg = JSON.parse(data) as RpcResponse;
      if (msg.id === id) return msg;
    } catch {
      /* a keep-alive or a partial frame — keep scanning */
    }
  }
  return null;
}

export class McpSession {
  private sessionId: string | null = null;
  private nextId = 1;
  private readonly url: URL;

  constructor(private readonly config: McpServerConfig) {
    this.url = parseServerUrl(config.url, config.allowedHosts);
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'MCP-Protocol-Version': PROTOCOL };
    if (this.config.token) {
      const name = this.config.headerName?.trim() || 'Authorization';
      h[name] = name.toLowerCase() === 'authorization' ? `Bearer ${this.config.token}` : this.config.token;
    }
    if (this.sessionId) h['Mcp-Session-Id'] = this.sessionId;
    return h;
  }

  private async post(body: Record<string, unknown>): Promise<Response> {
    const res = await fetch(this.url, { method: 'POST', headers: this.headers(), body: JSON.stringify(body), redirect: 'error', signal: AbortSignal.timeout(TIMEOUT_MS) });
    const sid = res.headers.get('mcp-session-id');
    if (sid) this.sessionId = sid;
    return res;
  }

  async request<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const id = this.nextId++;
    const res = await this.post({ jsonrpc: '2.0', id, method, params });
    if (res.status === 401 || res.status === 403) throw new ProviderError('The MCP server refused the token from the Tech portal entry.', res.status);
    if (!res.ok) throw new ProviderError(`The MCP server answered HTTP ${res.status}`, res.status);
    const text = await res.text();
    const type = res.headers.get('content-type') ?? '';
    const msg = type.includes('text/event-stream') ? readSse(text, id) : (JSON.parse(text) as RpcResponse);
    if (!msg) throw new ProviderError('The MCP server sent no answer', 502);
    if (msg.error) throw new ProviderError(msg.error.message, 502);
    return msg.result as T;
  }

  async initialize(): Promise<void> {
    await assertPublicResolution(this.url);
    await this.request('initialize', { protocolVersion: PROTOCOL, capabilities: {}, clientInfo: { name: 'duncit-intel', version: '1.0.0' } });
    await this.post({ jsonrpc: '2.0', method: 'notifications/initialized' }).catch(() => undefined);
  }

  async listTools(max = 500): Promise<McpTool[]> {
    const tools: McpTool[] = [];
    let cursor: string | undefined;
    do {
      const page = await this.request<{ tools?: McpTool[]; nextCursor?: string }>('tools/list', cursor ? { cursor } : {});
      tools.push(...(page.tools ?? []));
      cursor = page.nextCursor;
    } while (cursor && tools.length < max);
    return tools.slice(0, max);
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<{ text: string; isError: boolean }> {
    const result = await this.request<{ content?: Array<{ type: string; text?: string }>; structuredContent?: unknown; isError?: boolean }>('tools/call', { name, arguments: args });
    const text = (result.content ?? [])
      .map((c) => (c.type === 'text' ? (c.text ?? '') : `[${c.type} content]`))
      .join('\n')
      .trim();
    return { text: text || JSON.stringify(result.structuredContent ?? {}), isError: Boolean(result.isError) };
  }
}
