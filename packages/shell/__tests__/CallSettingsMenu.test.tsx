/**
 * The way in to audio and video settings during a call: a dialog, not a
 * dropdown, because testing a device needs a level meter and a picture, not
 * a list of names.
 */
import { act, fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const deviceTestState = vi.hoisted(() => ({
  devices: { mics: [], cams: [] } as { mics: MediaDeviceInfo[]; cams: MediaDeviceInfo[] },
  stream: null as MediaStream | null,
  level: 0,
  error: null as string | null,
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn(),
  testing: false,
}));
vi.mock('../src/staff-chat/devices/useDeviceTest', () => ({
  useDeviceTest: () => deviceTestState,
}));

import CallSettingsMenu from '../src/staff-chat/CallSettingsMenu';

describe('CallSettingsMenu', () => {
  it('opens the device settings dialog, and closes it from Done', async () => {
    const { getByLabelText, getByText, queryByText } = render(
      <CallSettingsMenu micId="" camId="" onMic={vi.fn()} onCam={vi.fn()} showCamera />,
    );

    fireEvent.click(getByLabelText('Audio and video settings'));
    expect(getByText('Done')).toBeInTheDocument();

    fireEvent.click(getByText('Done'));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 400));
    });

    expect(queryByText('Done')).not.toBeInTheDocument();
  });
});
