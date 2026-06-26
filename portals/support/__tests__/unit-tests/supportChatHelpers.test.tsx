import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FEEDBACK_OPTIONS, feedbackOption } from '../../src/lib/feedbackScale';
import { saveTranscript } from '../../src/lib/downloadTranscript';
import { tickState } from '../../src/pages/live-chat/ChatMessages/MessageTicks';
import MessageTicks from '../../src/pages/live-chat/ChatMessages/MessageTicks';
import { groupByDay } from '../../src/pages/live-chat/ChatMessages/groupByDay';
import JumpToLatestFab from '../../src/pages/live-chat/LiveChatPage/JumpToLatestFab';

describe('feedbackScale', () => {
  it('exposes the 5-point emoji scale and resolves a rating', () => {
    expect(FEEDBACK_OPTIONS).toHaveLength(5);
    expect(feedbackOption(5)?.emoji).toBe('😍');
    expect(feedbackOption(1)?.label).toMatch(/Dissatisfied/);
    expect(feedbackOption(null)).toBeNull();
    expect(feedbackOption(9)).toBeNull();
  });
});

describe('tickState', () => {
  const created = '2026-06-26T10:00:00Z';
  it('is pending without a real id', () => {
    expect(tickState('', created, null)).toBe('pending');
    expect(tickState('optimistic-1', created, null)).toBe('pending');
  });
  it('is sent when undelivered, seen once read past it', () => {
    expect(tickState('m1', created, null)).toBe('sent');
    expect(tickState('m1', created, '2026-06-26T09:00:00Z')).toBe('sent');
    expect(tickState('m1', created, '2026-06-26T10:30:00Z')).toBe('seen');
  });
});

describe('MessageTicks', () => {
  it('renders each tick state', () => {
    const { rerender } = render(<MessageTicks state="pending" />);
    expect(screen.getByLabelText('Sending')).toBeInTheDocument();
    rerender(<MessageTicks state="sent" />);
    expect(screen.getByLabelText('Delivered')).toBeInTheDocument();
    rerender(<MessageTicks state="seen" />);
    expect(screen.getByLabelText('Seen')).toBeInTheDocument();
  });
});

describe('groupByDay', () => {
  it('buckets consecutive same-day messages together', () => {
    const key = (iso: string) => iso.slice(0, 10);
    const label = (iso: string) => iso.slice(0, 10);
    const groups = groupByDay(
      [
        { id: 'a', created_at: '2026-06-25T10:00:00Z' } as any,
        { id: 'b', created_at: '2026-06-25T11:00:00Z' } as any,
        { id: 'c', created_at: '2026-06-26T09:00:00Z' } as any,
      ],
      key,
      label,
    );
    expect(groups).toHaveLength(2);
    expect(groups[0].messages).toHaveLength(2);
    expect(groups[1].messages).toHaveLength(1);
  });
});

describe('saveTranscript', () => {
  it('decodes base64 and triggers a download', () => {
    const click = vi.fn();
    const created = document.createElement('a');
    created.click = click;
    const createSpy = vi.spyOn(document, 'createElement').mockReturnValue(created);
    saveTranscript({ filename: 'x.txt', content_base64: 'aGk=' }, 'TXT');
    expect(click).toHaveBeenCalled();
    expect(created.download).toBe('x.txt');
    createSpy.mockRestore();
  });

  it('uses the docx mime for docx exports', () => {
    const click = vi.fn();
    const created = document.createElement('a');
    created.click = click;
    const createSpy = vi.spyOn(document, 'createElement').mockReturnValue(created);
    saveTranscript({ filename: 'x.docx', content_base64: 'aGk=' }, 'DOCX');
    expect(created.download).toBe('x.docx');
    createSpy.mockRestore();
  });
});

describe('JumpToLatestFab', () => {
  it('renders nothing when hidden, a button when shown', () => {
    const { rerender } = render(<JumpToLatestFab show={false} onClick={vi.fn()} />);
    expect(screen.queryByLabelText('Jump to latest')).not.toBeInTheDocument();
    rerender(<JumpToLatestFab show onClick={vi.fn()} />);
    expect(screen.getByLabelText('Jump to latest')).toBeInTheDocument();
  });
});
