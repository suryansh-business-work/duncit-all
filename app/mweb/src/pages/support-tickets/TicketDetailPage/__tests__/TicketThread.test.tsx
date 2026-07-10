import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TicketThread from '../TicketThread';
import type { TicketMessage } from '../../queries';

function makeMessages(n: number): TicketMessage[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `m${i}`,
    author_role: 'USER' as const,
    author_name: 'Riya',
    author_photo: null,
    body_text: `message ${i}`,
    attachments: [],
    created_at: '2026-06-26T05:00:00.000Z',
  }));
}

const baseProps = { timeZone: 'Asia/Kolkata', formatTime: () => '10:30', agentLastReadAt: null };

interface Metrics {
  scrollHeight: number;
  clientHeight: number;
  scrollTop: number;
}
function setMetrics(el: HTMLElement, m: Metrics) {
  Object.defineProperty(el, 'scrollHeight', { configurable: true, value: m.scrollHeight });
  Object.defineProperty(el, 'clientHeight', { configurable: true, value: m.clientHeight });
  Object.defineProperty(el, 'scrollTop', { configurable: true, writable: true, value: m.scrollTop });
}

let scrollToSpy: ReturnType<typeof vi.fn>;
beforeEach(() => {
  scrollToSpy = vi.fn();
  (HTMLElement.prototype as unknown as { scrollTo: unknown }).scrollTo = scrollToSpy;
});
afterEach(() => {
  delete (HTMLElement.prototype as unknown as { scrollTo?: unknown }).scrollTo;
});

const scrollContainer = (container: HTMLElement) =>
  container.firstElementChild!.firstElementChild as HTMLElement;

describe('TicketThread — jump-to-latest', () => {
  it('auto-scrolls to the latest message on open (pinned by default)', () => {
    render(<TicketThread messages={makeMessages(3)} {...baseProps} />);
    expect(scrollToSpy).toHaveBeenCalled();
  });

  it('stops auto-following once the user scrolls up', () => {
    const { container, rerender } = render(<TicketThread messages={makeMessages(2)} {...baseProps} />);
    const el = scrollContainer(container);
    setMetrics(el, { scrollHeight: 1000, clientHeight: 500, scrollTop: 0 }); // distance 500 → unpin
    fireEvent.scroll(el);
    const calls = scrollToSpy.mock.calls.length;
    rerender(<TicketThread messages={makeMessages(3)} {...baseProps} />);
    expect(scrollToSpy.mock.calls.length).toBe(calls); // no auto-scroll while unpinned
  });

  it('shows the jump button past the threshold, then re-pins and hides on tap', () => {
    const { container } = render(<TicketThread messages={makeMessages(3)} {...baseProps} />);
    const el = scrollContainer(container);
    setMetrics(el, { scrollHeight: 1000, clientHeight: 500, scrollTop: 0 }); // distance 500 → showJump
    fireEvent.scroll(el);
    const fab = screen.getByLabelText('Jump to latest');
    scrollToSpy.mockClear();
    fireEvent.click(fab);
    expect(scrollToSpy).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));
    expect(screen.queryByLabelText('Jump to latest')).not.toBeInTheDocument();
  });
});
