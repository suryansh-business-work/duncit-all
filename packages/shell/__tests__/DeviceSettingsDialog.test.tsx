/**
 * Picking a microphone and camera, and proving they work — the dialog itself
 * only wires the level bar, the error banner and the test/stop button to
 * whatever `useDeviceTest` reports; the device logic has its own tests.
 */
import { fireEvent, render, act } from '@testing-library/react';
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

import DeviceSettingsDialog from '../src/staff-chat/devices/DeviceSettingsDialog';

const baseProps = () => ({
  open: true,
  micId: '',
  camId: '',
  onMic: vi.fn(),
  onCam: vi.fn(),
  showCamera: true,
  onClose: vi.fn(),
});

describe('DeviceSettingsDialog', () => {
  it('starts the test on request, moving into the testing state', () => {
    deviceTestState.testing = false;
    const { getByText } = render(<DeviceSettingsDialog {...baseProps()} />);

    fireEvent.click(getByText('Test'));

    expect(deviceTestState.start).toHaveBeenCalledWith(true);
  });

  it('stops the test from its own button while testing', () => {
    deviceTestState.testing = true;
    const { getByText } = render(<DeviceSettingsDialog {...baseProps()} />);

    expect(getByText('Say something — the bar should move.')).toBeInTheDocument();
    fireEvent.click(getByText('Stop test'));

    expect(deviceTestState.stop).toHaveBeenCalledTimes(1);
    deviceTestState.testing = false;
  });

  it('shows an error banner when the device could not be opened', () => {
    deviceTestState.error = 'Could not open the microphone.';
    const { getByText } = render(<DeviceSettingsDialog {...baseProps()} />);

    expect(getByText('Could not open the microphone.')).toBeInTheDocument();
    deviceTestState.error = null;
  });

  it('attaches the preview stream to the video element once one arrives', () => {
    const { rerender } = render(<DeviceSettingsDialog {...baseProps()} />);
    const video = document.body.querySelector('video') as HTMLVideoElement;
    let assigned: unknown;
    Object.defineProperty(video, 'srcObject', {
      configurable: true,
      set(value) {
        assigned = value;
      },
      get() {
        return assigned;
      },
    });

    deviceTestState.stream = { id: 'preview' } as unknown as MediaStream;
    act(() => {
      rerender(<DeviceSettingsDialog {...baseProps()} />);
    });

    expect(assigned).toBe(deviceTestState.stream);
    deviceTestState.stream = null;
  });

  it('does not touch a video element on an audio-only call, since there is none', () => {
    deviceTestState.stream = { id: 'preview' } as unknown as MediaStream;

    expect(() => render(<DeviceSettingsDialog {...baseProps()} showCamera={false} />)).not.toThrow();
    expect(document.body.querySelector('video')).toBeNull();
    deviceTestState.stream = null;
  });
});
