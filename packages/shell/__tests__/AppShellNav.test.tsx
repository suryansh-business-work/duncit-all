/**
 * Both nav drawers: the temporary sheet below `md`, and the permanent one
 * that minimises to an icon rail — the collapsed flag lives in the
 * workspace, so it reads the same everywhere a reader signs in.
 */
import { MockedProvider } from '@apollo/client/testing/react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const workspaceState = vi.hoisted(() => ({
  value: null as null | { sidebarCollapsed: boolean; setSidebarCollapsed: (v: boolean) => void },
}));
vi.mock('../src/workspace', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/workspace')>()),
  useWorkspace: () => workspaceState.value,
}));

import { AppShellNav } from '../src/chrome/AppShellNav';

const mount = (over: Partial<Parameters<typeof AppShellNav>[0]> = {}) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[]}>
      <MemoryRouter>
        <AppShellNav name="CRM" nav={[]} mobileOpen={false} onCloseMobile={vi.fn()} {...over} />
      </MemoryRouter>
    </MockedProvider>,
  );

describe('AppShellNav', () => {
  it('stays uncollapsed with no workspace at all to read from', () => {
    workspaceState.value = null;
    const { container } = mount();
    expect(container.querySelector('.MuiDrawer-paper')).not.toBeNull();
  });

  it('shrinks to the icon rail once the workspace says it is collapsed', () => {
    workspaceState.value = { sidebarCollapsed: true, setSidebarCollapsed: vi.fn() };
    const { container } = mount();
    expect(container.querySelector('.MuiDrawer-paper')).not.toBeNull();
  });
});
