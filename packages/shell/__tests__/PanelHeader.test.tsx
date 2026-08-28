/**
 * The panel's own top bar: settings, your status, and the way out — the
 * close button never locks, even mid-upload, only its tooltip changes to
 * say so.
 */
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import PanelHeader from '../src/staff-chat/PanelHeader';
import type { ChatSettings } from '../src/staff-chat/useChatSettings';

const SETTINGS: ChatSettings = {
  density: 'COMFORTABLE',
  bubbleColor: 'primary',
  fontSize: 14,
  timeZone: '',
  enterToSend: true,
};

const baseProps = () => ({
  settings: SETTINGS,
  onSettings: vi.fn(),
  status: 'ONLINE' as const,
  onStatus: vi.fn(),
  busy: false,
  onClose: vi.fn(),
  settingsOpen: false,
  onOpenSettings: vi.fn(),
  onCloseSettings: vi.fn(),
});

describe('PanelHeader', () => {
  it('always closes, even while a recording is still uploading', () => {
    const onClose = vi.fn();
    const { getByLabelText } = render(<PanelHeader {...baseProps()} busy onClose={onClose} />);

    fireEvent.click(getByLabelText('Close chat'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes normally with nothing running in the background', () => {
    const onClose = vi.fn();
    const { getByLabelText } = render(<PanelHeader {...baseProps()} busy={false} onClose={onClose} />);

    fireEvent.click(getByLabelText('Close chat'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
