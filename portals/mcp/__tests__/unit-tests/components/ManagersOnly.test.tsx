import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const m = vi.hoisted(() => ({ manager: false }));
vi.mock('../../../src/lib/roles', () => ({ useIsMcpManager: () => m.manager }));

import ManagersOnly from '../../../src/components/ManagersOnly';

describe('ManagersOnly', () => {
  it('shows the page to an MCP manager', () => {
    m.manager = true;
    render(
      <ManagersOnly>
        <p>the settings form</p>
      </ManagersOnly>,
    );
    expect(screen.getByText('the settings form')).toBeInTheDocument();
    expect(screen.queryByTestId('mcp-managers-only')).not.toBeInTheDocument();
  });

  it('tells anyone else why the page is closed, and does not render it at all', () => {
    m.manager = false;
    render(
      <ManagersOnly>
        <p>the settings form</p>
      </ManagersOnly>,
    );
    expect(screen.queryByText('the settings form')).not.toBeInTheDocument();
    const notice = screen.getByTestId('mcp-managers-only');
    expect(notice).toHaveTextContent('Only MCP managers can open this page');
    expect(notice).toHaveTextContent('Ask an admin for the MCP Manager role');
  });
});
