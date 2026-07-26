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
import type { MountPortalOptions } from '../src/types';

function baseOpts(over: Partial<MountPortalOptions> = {}): MountPortalOptions {
  return {
    config: { key: 'crm', name: 'CRM', tokenKey: 'tok_key', colorModeKey: 'cm' },
    apolloClient: {} as MountPortalOptions['apolloClient'],
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

describe('mountPortal', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    renderSpy.mockClear();
    createRootSpy.mockClear();
    logs.configureLogs.mockClear();
    logs.httpTransport.mockClear();
    localStorage.clear();
  });

  it('configures logging and mounts the provider tree on #root', () => {
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);

    mountPortal(baseOpts());

    expect(logs.httpTransport).toHaveBeenCalledWith('https://api.test/logs');
    expect(logs.configureLogs).toHaveBeenCalledWith('transport', { platform: 'web', portal: 'crm' });
    expect(createRootSpy).toHaveBeenCalledWith(root);
    expect(renderSpy).toHaveBeenCalledTimes(1);

    // The `isAuthed` closure handed to UserProvider reads the token key.
    const tree = renderSpy.mock.calls[0][0] as { props: { children: { props: { children: { props: { isAuthed: () => boolean } } } } } };
    const isAuthed = tree.props.children.props.children.props.isAuthed;
    expect(isAuthed()).toBe(false);
    localStorage.setItem('tok_key', '1');
    expect(isAuthed()).toBe(true);
  });

  it("layers the portal's own copy over the shell chrome bundle", () => {
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

    const fallback = findFallback(renderSpy.mock.calls[0][0]);
    expect(fallback?.['crm.leads.title']).toBe('Leads');
    expect(fallback?.['shell.profile.title']).toBe('My CRM profile');
    // The shell's own keys survive the merge.
    expect(fallback?.['mweb.common.language']).toBe('Language');
  });

  it('throws a clear error when the mount node is missing', () => {
    expect(() => mountPortal(baseOpts({ rootId: 'missing' }))).toThrow('mountPortal: #missing mount node not found');
  });

  it('honours a custom wrap, rootId and optional slots', () => {
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

    expect(wrap).toHaveBeenCalledTimes(1);
    expect(createRootSpy).toHaveBeenCalledWith(node);
    expect(renderSpy).toHaveBeenCalledTimes(1);
  });
});
