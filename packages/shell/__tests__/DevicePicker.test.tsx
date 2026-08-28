/**
 * One device list — a device the browser has not yet named (no permission
 * granted here) is numbered rather than shown as an empty row.
 */
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import DevicePicker from '../src/staff-chat/devices/DevicePicker';

const device = (deviceId: string, label: string): MediaDeviceInfo =>
  ({ deviceId, label, kind: 'audioinput', groupId: '' }) as MediaDeviceInfo;

describe('DevicePicker', () => {
  it('names a device the browser already knows', () => {
    const { getByRole, getByText } = render(
      <DevicePicker label="Microphone" devices={[device('mic-1', 'Built-in Mic')]} value="" onChange={vi.fn()} />,
    );
    fireEvent.mouseDown(getByRole('combobox', { name: 'Microphone' }));
    expect(getByText('Built-in Mic')).toBeInTheDocument();
  });

  it('keys a device with no id of its own by its position instead', () => {
    const { getByRole, getByText } = render(
      <DevicePicker label="Microphone" devices={[device('', 'Virtual Mic')]} value="" onChange={vi.fn()} />,
    );
    fireEvent.mouseDown(getByRole('combobox', { name: 'Microphone' }));
    expect(getByText('Virtual Mic')).toBeInTheDocument();
  });

  it('numbers a device with no label yet, rather than showing a blank row', () => {
    const { getByRole, getByText } = render(
      <DevicePicker label="Microphone" devices={[device('mic-1', '')]} value="" onChange={vi.fn()} />,
    );
    fireEvent.mouseDown(getByRole('combobox', { name: 'Microphone' }));
    expect(getByText('Device 1')).toBeInTheDocument();
  });

  it('reports the chosen device', () => {
    const onChange = vi.fn();
    const { getByRole, getAllByRole } = render(
      <DevicePicker
        label="Microphone"
        devices={[device('mic-1', 'Built-in Mic'), device('mic-2', 'USB Mic')]}
        value=""
        onChange={onChange}
      />,
    );

    fireEvent.mouseDown(getByRole('combobox', { name: 'Microphone' }));
    fireEvent.click(getAllByRole('option').find((option) => option.textContent === 'USB Mic') as HTMLElement);

    expect(onChange).toHaveBeenCalledWith('mic-2');
  });
});
