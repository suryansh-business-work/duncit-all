import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MessageActionsMenu, { type MessageActionsTarget } from '../MessageActionsMenu';

/** The menu anchors to the line's "more" button; any element in the page will do here. */
const anchor = () => document.body;

const handlers = () => ({ onClose: vi.fn(), onReact: vi.fn(), onReply: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn(), onReport: vi.fn() });

const openOn = (target: Omit<MessageActionsTarget, 'el'>, props: Partial<ReturnType<typeof handlers>> & { canModerate?: boolean } = {}) => {
  const spies = { ...handlers(), ...props };
  render(<MessageActionsMenu target={{ el: anchor(), ...target }} canModerate={props.canModerate ?? false} {...spies} />);
  return spies;
};

const items = () => within(screen.getByRole('menu')).getAllByRole('menuitem').map((item) => item.textContent);

describe('MessageActionsMenu', () => {
  it("offers a pod room's member React, Reply and Report on someone else's line — nothing to edit or delete", () => {
    openOn({ id: 'm1', mine: false });
    expect(items()).toEqual(['React', 'Reply', 'Report message']);
  });

  it('offers Edit only on a line marked editable, and runs it for that line', () => {
    const spies = openOn({ id: 'm2', mine: true, editable: true });
    expect(items()).toEqual(['React', 'Reply', 'Edit message', 'Delete message']);

    fireEvent.click(screen.getByTestId('chat-message-action-edit'));
    expect(spies.onEdit).toHaveBeenCalledWith('m2');
    expect(spies.onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps Edit off a line not marked editable, even with an edit handler', () => {
    openOn({ id: 'm3', mine: true });
    expect(screen.queryByTestId('chat-message-action-edit')).not.toBeInTheDocument();
    expect(screen.getByTestId('chat-message-action-delete')).toBeInTheDocument();
  });

  it('offers no Edit where the room edits nothing, whatever the line says', () => {
    openOn({ id: 'm4', mine: true, editable: true }, { onEdit: undefined });
    expect(screen.queryByTestId('chat-message-action-edit')).not.toBeInTheDocument();
  });

  it('offers no Report in a room nothing is reported from (a venue chat)', () => {
    openOn({ id: 'm5', mine: false }, { onReport: undefined, onReply: undefined });
    expect(items()).toEqual(['React']);
  });

  it("lets a moderator delete someone else's line, and reports it for them", () => {
    const spies = openOn({ id: 'm6', mine: false }, { canModerate: true });
    fireEvent.click(screen.getByTestId('chat-message-action-delete'));
    expect(spies.onDelete).toHaveBeenCalledWith('m6');
  });

  it('reports the line it was opened on', () => {
    const spies = openOn({ id: 'm7', mine: false });
    fireEvent.click(screen.getByTestId('chat-message-action-report'));
    expect(spies.onReport).toHaveBeenCalledWith('m7');
    expect(spies.onClose).toHaveBeenCalledTimes(1);
  });

  it('is closed with no line to act on', () => {
    render(<MessageActionsMenu target={null} canModerate={false} {...handlers()} />);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
