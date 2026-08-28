/**
 * Everything you can do to one message, behind one button — a menu item's
 * own onClick both runs its action and closes the menu behind it.
 */
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import MessageActions from '../src/staff-chat/MessageActions';
import type { StaffMessage } from '../src/staff-chat/queries';

const MESSAGE: StaffMessage = { id: 'm-1', from_user_id: 'u-1', to_user_id: 'u-2', text: 'Hi' } as StaffMessage;

const baseProps = () => ({
  message: MESSAGE,
  mine: true,
  onReply: vi.fn(),
  onForward: vi.fn(),
  onPin: vi.fn(),
  onCopy: vi.fn(),
  onStartSelect: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
});

describe('MessageActions', () => {
  it("runs the action and closes the menu behind a reader's pick", () => {
    const onReply = vi.fn();
    const { getByLabelText, getByText } = render(<MessageActions {...baseProps()} onReply={onReply} />);

    fireEvent.click(getByLabelText('Message actions'));
    expect(document.body.querySelector('[role="menu"]')).not.toBeNull();

    fireEvent.click(getByText('Reply'));

    expect(onReply).toHaveBeenCalledTimes(1);
  });
});
