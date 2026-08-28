/**
 * What is said ABOUT a message before its words: pinned, forwarded, and what
 * it is replying to.
 */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import BubbleBadges from '../src/staff-chat/message-bubble/BubbleBadges';
import type { StaffMessage } from '../src/staff-chat/queries';

const MESSAGE: StaffMessage = { id: 'm-1', from_user_id: 'u-1', to_user_id: 'u-2', text: 'Hi' } as StaffMessage;

describe('BubbleBadges', () => {
  it('renders nothing at all for a plain message with no reply behind it', () => {
    const { container } = render(<BubbleBadges message={MESSAGE} own={false} nameOf={(id) => id} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("quotes the replied-to message's own text, on your own side of the thread", () => {
    const replied: StaffMessage = { ...MESSAGE, id: 'm-0', from_user_id: 'u-2', text: 'Where are you' };
    const { container } = render(
      <BubbleBadges message={MESSAGE} own nameOf={(id) => id} repliedTo={replied} />,
    );
    expect(container.textContent).toContain('Where are you');
  });

  it("quotes the attachment name when the replied-to message has no text", () => {
    const replied: StaffMessage = { ...MESSAGE, id: 'm-0', text: '', attachment_name: 'floorplan.pdf' };
    const { container } = render(
      <BubbleBadges message={MESSAGE} own={false} nameOf={(id) => id} repliedTo={replied} />,
    );
    expect(container.textContent).toContain('floorplan.pdf');
  });

  it('falls back to a generic attachment label with neither text nor a name', () => {
    const replied: StaffMessage = { ...MESSAGE, id: 'm-0', text: '', attachment_name: undefined };
    const { container } = render(
      <BubbleBadges message={MESSAGE} own={false} nameOf={(id) => id} repliedTo={replied} />,
    );
    expect(container.textContent).toContain('Attachment');
  });
});
