/**
 * How each AI app is pointed at a Duncit connector. The URL always comes from
 * the caller (the server's connector list, or the Guide's pattern); this only
 * says where to paste it and in what shape each app expects it.
 */

export type ClientKey = 'claude' | 'chatgpt' | 'gemini' | 'claudeCode' | 'vscode';

export interface ClientGuide {
  key: ClientKey;
  nameKey: string;
  /** The steps, in order. */
  stepKeys: readonly string[];
  /** What to paste: the URL itself, or a command or settings block built around it. */
  snippet: (url: string) => string;
  /** The copy button's name for that snippet. */
  copyKey: string;
}

/** The name the coding agents register the server under (`claude mcp add … duncit`). */
const SERVER_NAME = 'duncit';

const settingsJson = (value: unknown) => JSON.stringify(value, null, 2);

export const CLIENT_GUIDES: readonly ClientGuide[] = [
  {
    key: 'claude',
    nameKey: 'mcp.clients.claude.name',
    stepKeys: ['mcp.clients.claude.step1', 'mcp.clients.claude.step2', 'mcp.clients.claude.step3'],
    snippet: (url) => url,
    copyKey: 'mcp.clients.copyUrl',
  },
  {
    key: 'chatgpt',
    nameKey: 'mcp.clients.chatgpt.name',
    stepKeys: ['mcp.clients.chatgpt.step1', 'mcp.clients.chatgpt.step2', 'mcp.clients.chatgpt.step3'],
    snippet: (url) => url,
    copyKey: 'mcp.clients.copyUrl',
  },
  {
    key: 'gemini',
    nameKey: 'mcp.clients.gemini.name',
    stepKeys: ['mcp.clients.gemini.step1', 'mcp.clients.gemini.step2'],
    snippet: (url) => settingsJson({ mcpServers: { [SERVER_NAME]: { httpUrl: url } } }),
    copyKey: 'mcp.clients.copySettings',
  },
  {
    key: 'claudeCode',
    nameKey: 'mcp.clients.claudeCode.name',
    stepKeys: ['mcp.clients.claudeCode.step1', 'mcp.clients.claudeCode.step2'],
    snippet: (url) => ['claude', 'mcp', 'add', '--transport', 'http', SERVER_NAME, url].join(' '),
    copyKey: 'mcp.clients.copyCommand',
  },
  {
    key: 'vscode',
    nameKey: 'mcp.clients.vscode.name',
    stepKeys: ['mcp.clients.vscode.step1', 'mcp.clients.vscode.step2'],
    snippet: (url) => settingsJson({ servers: { [SERVER_NAME]: { type: 'http', url } } }),
    copyKey: 'mcp.clients.copySettings',
  },
];
