import { describe, it, expect, vi, beforeEach } from 'vitest';

const renderSpy = vi.hoisted(() => vi.fn());
const createRootSpy = vi.hoisted(() => vi.fn(() => ({ render: renderSpy })));
const logs = vi.hoisted(() => ({
  configureLogs: vi.fn(),
  httpTransport: vi.fn(() => 'transport'),
}));

vi.mock('@fontsource/nunito/400.css', () => ({}));
vi.mock('@fontsource/nunito/600.css', () => ({}));
vi.mock('@fontsource/nunito/700.css', () => ({}));
vi.mock('@fontsource/nunito/800.css', () => ({}));
vi.mock('react-dom/client', () => ({ default: { createRoot: createRootSpy }, createRoot: createRootSpy }));
vi.mock('@duncit/logs', () => logs);

import { mountPortal } from '../src/mountPortal';
import { getGoogleClientId, setGoogleClientId } from '../src/lib/google-client-id';
import type { MountPortalOptions } from '../src/types';

/** Boot resolves the Google client id before rendering, so every assertion
 *  about the render waits for that promise chain to settle. */
const mounted = () => vi.waitFor(() => expect(renderSpy).toHaveBeenCalledTimes(1));

/** An Apollo stub answering the shell's publicClientConfig query. */
const apolloWith = (googleClientId: string | null) =>
  ({ query: vi.fn().mockResolvedValue({ data: { publicClientConfig: { google_client_id: googleClientId } } }) }) as unknown as MountPortalOptions['apolloClient'];

function baseOpts(over: Partial<MountPortalOptions> = {}): MountPortalOptions {
  return {
    config: { key: 'crm', name: 'CRM', tokenKey: 'tok_key', colorModeKey: 'cm' },
    apolloClient: apolloWith(''),
    graphqlUrl: 'https://api.test/graphql',
    logsPortal: 'crm' as MountPortalOptions['logsPortal'],
    loadUser: vi.fn(),
    children: 'app',
    ...over,
  };
}

/** The `fallback` prop of the LocaleProvider, found by walking the element
 * tree — so the assertion does not break when a provider is added above it. */
function findFallback(node: any): Record<string, string> | null {
  if (!node?.props) return null;
  if (node.props.fallback) return node.props.fallback;
  return findFallback(node.props.children);
}

/** The `clientId` of the GoogleOAuthProvider, or null when it is not mounted. */
function findClientId(node: any): string | null {
  if (!node?.props) return null;
  if (node.props.clientId) return node.props.clientId;
  return findClientId(node.props.children);
}

describe('mountPortal', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    renderSpy.mockClear();
    createRootSpy.mockClear();
    logs.configureLogs.mockClear();
    logs.httpTransport.mockClear();
    localStorage.clear();
    setGoogleClientId('');
  });

  it('configures logging and mounts the provider tree on #root', async () => {
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);

    mountPortal(baseOpts());

    expect(logs.httpTransport).toHaveBeenCalledWith('https://api.test/logs');
    expect(logs.configureLogs).toHaveBeenCalledWith('transport', { platform: 'web', portal: 'crm' });
    await mounted();
    expect(createRootSpy).toHaveBeenCalledWith(root);

    // The `isAuthed` closure handed to UserProvider reads the token key.
    const tree = renderSpy.mock.calls[0][0] as { props: { children: { props: { children: { props: { isAuthed: () => boolean } } } } } };
    const isAuthed = tree.props.children.props.children.props.isAuthed;
    expect(isAuthed()).toBe(false);
    localStorage.setItem('tok_key', '1');
    expect(isAuthed()).toBe(true);
  });

  it("layers the portal's own copy over the shell chrome bundle", async () => {
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);

    mountPortal(
      baseOpts({
        i18nFallback: {
          'crm.leads.title': 'Leads',
          // A portal may override shared chrome copy without forking it.
          'shell.profile.title': 'My CRM profile',
        },
      }),
    );

    await mounted();
    const fallback = findFallback(renderSpy.mock.calls[0][0]);
    expect(fallback?.['crm.leads.title']).toBe('Leads');
    expect(fallback?.['shell.profile.title']).toBe('My CRM profile');
    // The shell's own keys survive the merge.
    expect(fallback?.['mweb.common.language']).toBe('Language');
  });

  it('throws a clear error when the mount node is missing', () => {
    expect(() => mountPortal(baseOpts({ rootId: 'missing' }))).toThrow('mountPortal: #missing mount node not found');
  });

  it('honours a custom wrap, rootId and optional slots', async () => {
    const node = document.createElement('div');
    node.id = 'app';
    document.body.appendChild(node);
    const wrap = vi.fn((n) => n);

    mountPortal(
      baseOpts({
        rootId: 'app',
        wrap,
        extras: 'extras',
        googleClientId: 'gid',
        userStorageKey: 'crm_user_override',
      }),
    );

    await mounted();
    expect(wrap).toHaveBeenCalledTimes(1);
    expect(createRootSpy).toHaveBeenCalledWith(node);
    // Nothing configured server-side → the `googleClientId` option is the fallback.
    expect(getGoogleClientId()).toBe('gid');
    expect(findClientId(renderSpy.mock.calls[0][0])).toBe('gid');
  });

  it('prefers the runtime client id from the server over the mount option', async () => {
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);

    mountPortal(baseOpts({ apolloClient: apolloWith('runtime-id'), googleClientId: 'built-in' }));

    await mounted();
    expect(getGoogleClientId()).toBe('runtime-id');
    expect(findClientId(renderSpy.mock.calls[0][0])).toBe('runtime-id');
  });

  it('leaves the Google provider out entirely when no client id is configured', async () => {
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);

    mountPortal(baseOpts());

    await mounted();
    expect(getGoogleClientId()).toBe('');
    expect(findClientId(renderSpy.mock.calls[0][0])).toBeNull();
  });
});
