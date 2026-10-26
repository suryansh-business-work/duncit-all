import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

interface NavItem {
  to?: string;
}

const m = vi.hoisted(() => ({
  manager: false,
  shell: null as null | { nav: NavItem[]; profileTo?: string; hasAppAccess: (roles: string[]) => boolean },
}));

vi.mock('../../../src/lib/roles', () => ({ useIsMcpManager: () => m.manager }));
vi.mock('@duncit/shell', async (io) => ({
  ...(await io<typeof import('@duncit/shell')>()),
  PortalAppShell: (props: {
    nav: NavItem[];
    profileTo?: string;
    hasAppAccess: (roles: string[]) => boolean;
    children: ReactNode;
  }) => {
    m.shell = props;
    return <div data-testid="chrome">{props.children}</div>;
  },
}));

import McpAppShell from '../../../src/components/McpAppShell';

const paths = () => m.shell?.nav.map((item) => item.to) ?? [];

describe('McpAppShell', () => {
  it('lists Settings in the sidebar for an MCP manager', () => {
    m.manager = true;
    render(<McpAppShell>page</McpAppShell>);
    expect(paths()).toContain('/settings');
    expect(paths()).toHaveLength(7);
    expect(screen.getByTestId('chrome')).toHaveTextContent('page');
  });

  it('leaves Settings out for everyone else, keeping every other screen', () => {
    m.manager = false;
    render(<McpAppShell>page</McpAppShell>);
    expect(paths()).not.toContain('/settings');
    expect(paths()).toEqual(['/', '/activity', '/tools', '/connect', '/connections', '/guide']);
  });

  it('wires the console’s own role gate and profile page into the chrome', () => {
    m.manager = false;
    render(<McpAppShell>page</McpAppShell>);
    expect(m.shell?.profileTo).toBe('/profile');
    expect(m.shell?.hasAppAccess(['MCP_USER'])).toBe(true);
    expect(m.shell?.hasAppAccess(['HOST'])).toBe(false);
  });
});
