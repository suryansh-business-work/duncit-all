import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const m = vi.hoisted(() => ({ manager: false }));
vi.mock('../../../src/lib/roles', () => ({ useIsMcpManager: () => m.manager }));
vi.mock('../../../src/pages/settings/SettingsEditor', () => ({ default: () => <div data-testid="settings-editor" /> }));

import SettingsPage from '../../../src/pages/settings/SettingsPage';

describe('SettingsPage', () => {
  it('opens the settings for an MCP manager', () => {
    m.manager = true;
    render(<SettingsPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'MCP settings' })).toBeInTheDocument();
    expect(screen.getByTestId('settings-editor')).toBeInTheDocument();
  });

  it('keeps the settings — and their request — from anyone else, saying why', () => {
    m.manager = false;
    render(<SettingsPage />);
    expect(screen.queryByTestId('settings-editor')).not.toBeInTheDocument();
    expect(screen.getByTestId('mcp-managers-only')).toHaveTextContent('Only MCP managers can open this page');
  });
});
