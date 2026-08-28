/**
 * A failure in two registers: the sentence at the top for whoever hit it, the
 * whole throw underneath — hidden until asked for, copyable in one press.
 */
import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import FailureAlert from '../src/staff-chat/FailureAlert';
import type { Failure } from '../src/staff-chat/failure';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('FailureAlert', () => {
  it('shows only the headline when there is no detail worth a second register', () => {
    const failure: Failure = { message: 'shell.chat.call.startVideoFirst', detail: '' };
    const { container } = render(<FailureAlert failure={failure} />);

    expect(container.textContent).toContain('shell.chat.call.startVideoFirst');
    expect(container.querySelector('button')).toBeNull();
  });

  it('offers no second register when the detail just repeats the headline', () => {
    const failure: Failure = { message: 'Could not start the call', detail: 'Could not start the call' };
    const { container } = render(<FailureAlert failure={failure} />);

    expect(container.querySelector('button')).toBeNull();
  });

  it('toggles the detail block open and closed', () => {
    const failure: Failure = { message: 'Could not start the call', detail: 'Error: no camera' };
    const { container } = render(<FailureAlert failure={failure} />);

    expect(container.textContent).toContain('Show details');
    fireEvent.click(container.querySelectorAll('button')[0]);
    expect(container.textContent).toContain('Hide details');
    fireEvent.click(container.querySelectorAll('button')[0]);
    expect(container.textContent).toContain('Show details');
  });

  it('copies the detail, flashing Copied, when the clipboard accepts it', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, 'clipboard', { configurable: true, value: { writeText } });
    const failure: Failure = { message: 'Could not start the call', detail: 'Error: no camera' };
    const { container } = render(<FailureAlert failure={failure} />);

    await act(async () => {
      fireEvent.click(container.querySelectorAll('button')[1]);
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledWith('Error: no camera');
    expect(container.textContent).toContain('Copied');
  });

  it('stays uncopied when the clipboard refuses', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('no permission'));
    Object.defineProperty(globalThis.navigator, 'clipboard', { configurable: true, value: { writeText } });
    const failure: Failure = { message: 'Could not start the call', detail: 'Error: no camera' };
    const { container } = render(<FailureAlert failure={failure} />);

    await act(async () => {
      fireEvent.click(container.querySelectorAll('button')[1]);
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Copy');
    expect(container.textContent).not.toContain('Copied');
  });

  it('does nothing when there is no clipboard API at all', () => {
    Object.defineProperty(globalThis.navigator, 'clipboard', { configurable: true, value: undefined });
    const failure: Failure = { message: 'Could not start the call', detail: 'Error: no camera' };
    const { container } = render(<FailureAlert failure={failure} />);

    expect(() => {
      fireEvent.click(container.querySelectorAll('button')[1]);
    }).not.toThrow();
  });

  it('calls onDismiss from the alert close button', () => {
    const onDismiss = vi.fn();
    const failure: Failure = { message: 'Could not start the call', detail: '' };
    const { container } = render(<FailureAlert failure={failure} onDismiss={onDismiss} />);

    fireEvent.click(container.querySelector('[aria-label="Close"]') as HTMLElement);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
