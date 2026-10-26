import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MessageBubble from '../MessageBubble';

const message = (over: Record<string, unknown> = {}) => ({
  id: 'm1',
  user_id: 'u-other',
  user_name: 'Ravi',
  user_photo: null,
  type: 'TEXT',
  text: 'See you at 7',
  image_url: null,
  deleted: false,
  createdAt: '2026-12-01T06:00:00.000Z',
  edited_at: null,
  reactions: [],
  ...over,
});

describe('MessageBubble — the edited mark', () => {
  it('says a line was edited after its time', () => {
    render(<MessageBubble message={message({ edited_at: '2026-12-01T06:05:00.000Z' })} mine />);
    expect(screen.getByText(/· Edited$/)).toBeInTheDocument();
  });

  it('says nothing on a line as first sent', () => {
    render(<MessageBubble message={message()} mine={false} />);
    expect(screen.getByText('See you at 7')).toBeInTheDocument();
    expect(screen.queryByText(/Edited/)).not.toBeInTheDocument();
  });

  it('drops the mark once the line is deleted — there are no words left to have changed', () => {
    render(<MessageBubble message={message({ edited_at: '2026-12-01T06:05:00.000Z', deleted: true })} mine={false} />);
    expect(screen.getByText('deleted')).toBeInTheDocument();
    expect(screen.queryByText(/Edited/)).not.toBeInTheDocument();
  });
});
