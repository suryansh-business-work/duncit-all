/**
 * What the call recording is doing, under the call controls — a real
 * percentage for upload/convert since they are slow for different reasons,
 * and a plain done state offering download, send-to-chat and dismiss.
 */
import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CallRecorder from '../src/staff-chat/CallRecorder';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const baseProps = () => ({
  stage: 'IDLE' as const,
  pct: 0,
  url: null as string | null,
  error: null as string | null,
  onSendToChat: vi.fn(),
  onDismiss: vi.fn(),
});

describe('CallRecorder', () => {
  it('renders nothing at all while idle', () => {
    const { container } = render(<CallRecorder {...baseProps()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('names the failure, or falls back to a generic one with no message at all', () => {
    const { rerender, container } = render(
      <CallRecorder {...baseProps()} stage="FAILED" error="Could not save the recording" />,
    );
    expect(container.textContent).toContain('Could not save the recording');

    rerender(<CallRecorder {...baseProps()} stage="FAILED" error={null} />);
    expect(container.textContent).toContain('The recording could not be saved.');
  });

  it('counts the recording up from zero, real seconds', () => {
    const { container } = render(<CallRecorder {...baseProps()} stage="RECORDING" />);
    expect(container.textContent).toContain('00:00');

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(container.textContent).toContain('00:03');
  });

  it('shows an indeterminate bar with no percentage line while nothing has been reported yet', () => {
    const { container } = render(<CallRecorder {...baseProps()} stage="UPLOADING" pct={0} />);
    expect(container.querySelector('.MuiLinearProgress-indeterminate')).not.toBeNull();
    expect(container.textContent).not.toMatch(/\d+%/);
  });

  it('shows a real determinate percentage once one is reported', () => {
    const { container } = render(<CallRecorder {...baseProps()} stage="CONVERTING" pct={42} />);
    expect(container.querySelector('.MuiLinearProgress-determinate')).not.toBeNull();
    expect(container.textContent).toContain('42%');
  });

  it('offers a download link, sends the mp4 to chat and dismisses, once ready', () => {
    const onSendToChat = vi.fn();
    const onDismiss = vi.fn();
    const { getByText, getByLabelText } = render(
      <CallRecorder {...baseProps()} stage="READY" url="https://ik.duncit.com/call.mp4" onSendToChat={onSendToChat} onDismiss={onDismiss} />,
    );

    expect(getByText('Download').closest('a')).toHaveAttribute('href', 'https://ik.duncit.com/call.mp4');

    fireEvent.click(getByText('Send to chat'));
    expect(onSendToChat).toHaveBeenCalledWith('https://ik.duncit.com/call.mp4');

    fireEvent.click(getByLabelText('Dismiss the recording'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does nothing on a send-to-chat press with no url to send, since it should never render one', () => {
    const onSendToChat = vi.fn();
    const { getByText } = render(<CallRecorder {...baseProps()} stage="READY" url={null} onSendToChat={onSendToChat} />);

    fireEvent.click(getByText('Send to chat'));

    expect(onSendToChat).not.toHaveBeenCalled();
  });
});
