import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NotifyHost, notify, notifyError, notifySuccess } from '../notify';

const EVENT = 'duncit:notify';

describe('notify (imperative helpers)', () => {
  it('dispatches a duncit:notify CustomEvent with message, severity and duration', () => {
    const spy = vi.fn();
    globalThis.addEventListener(EVENT, spy);
    notify('hello', 'warning', 1234);
    globalThis.removeEventListener(EVENT, spy);

    expect(spy).toHaveBeenCalledTimes(1);
    const detail = (spy.mock.calls[0][0] as CustomEvent).detail;
    expect(detail).toEqual({ message: 'hello', severity: 'warning', duration: 1234 });
  });

  it('defaults severity to info and duration to 4000', () => {
    const spy = vi.fn();
    globalThis.addEventListener(EVENT, spy);
    notify('plain');
    globalThis.removeEventListener(EVENT, spy);

    const detail = (spy.mock.calls[0][0] as CustomEvent).detail;
    expect(detail).toEqual({ message: 'plain', severity: 'info', duration: 4000 });
  });

  it('notifyError dispatches with error severity', () => {
    const spy = vi.fn();
    globalThis.addEventListener(EVENT, spy);
    notifyError('boom');
    globalThis.removeEventListener(EVENT, spy);

    expect((spy.mock.calls[0][0] as CustomEvent).detail.severity).toBe('error');
  });

  it('notifySuccess dispatches with success severity', () => {
    const spy = vi.fn();
    globalThis.addEventListener(EVENT, spy);
    notifySuccess('yay');
    globalThis.removeEventListener(EVENT, spy);

    expect((spy.mock.calls[0][0] as CustomEvent).detail.severity).toBe('success');
  });
});

function fire(detail: unknown) {
  act(() => {
    globalThis.dispatchEvent(new CustomEvent(EVENT, { detail }));
  });
}

describe('NotifyHost', () => {
  it('renders nothing (closed snackbar) before any event', () => {
    render(<NotifyHost />);
    expect(screen.queryByText('anything')).not.toBeInTheDocument();
  });

  it('shows the message and severity when a notify event fires', async () => {
    render(<NotifyHost />);
    fire({ message: 'Saved!', severity: 'success', duration: 4000 });

    expect(await screen.findByText('Saved!')).toBeInTheDocument();
    expect(document.querySelector('.MuiAlert-filledSuccess')).toBeInTheDocument();
  });

  it('ignores events with no message', () => {
    render(<NotifyHost />);
    fire({ message: '', severity: 'error' });
    expect(document.querySelector('.MuiSnackbar-root')).not.toBeInTheDocument();
  });

  it('ignores events with no detail', () => {
    render(<NotifyHost />);
    fire(undefined);
    expect(document.querySelector('.MuiSnackbar-root')).not.toBeInTheDocument();
  });

  it('closes when the Alert close button is clicked', async () => {
    render(<NotifyHost />);
    fire({ message: 'Bye', severity: 'info' });
    await screen.findByText('Bye');

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    await waitFor(() => expect(screen.queryByText('Bye')).not.toBeInTheDocument());
  });

  it('does not close on clickaway reason', async () => {
    render(<NotifyHost />);
    fire({ message: 'Sticky', severity: 'warning' });
    await screen.findByText('Sticky');

    // Clickaway: mousedown/up on the document body outside the snackbar.
    fireEvent.click(document.body);
    expect(screen.getByText('Sticky')).toBeInTheDocument();
  });

  it('removes the event listener on unmount', () => {
    const removeSpy = vi.spyOn(globalThis, 'removeEventListener');
    const { unmount } = render(<NotifyHost />);
    unmount();
    expect(removeSpy).toHaveBeenCalledWith(EVENT, expect.any(Function));
    removeSpy.mockRestore();
  });
});
